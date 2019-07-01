import React from 'react';
import Konva from 'konva';
import BrokersService from '../../services/BrokersService';

import ClustersService from '../../services/ClustersService';
import TopicsService from '../../services/TopicsService';
import {
  KafkaIcon, PartitionIcon, TopicsIcon, ZookeeperIcon,
} from '../../services/SvgService';
import ThemesStore from '../../stores/ThemesStore';
import Loader from '../../components/loader/Loader';
import MetricsService from '../../services/MetricsService';
import { Link } from 'react-router-dom';

const hexagonesHeight = 120;
const hexagonesWidth = 108;
const hexagonesMargin = 6;

let generateClusterMatrix;
let findMatrixFreePosition;
let fillMatrixWithCluster;
let findFreeNeighbourPosition;
let getNeighbourCellPosition;
let getRandomNeighbourPosition;
let newText;
let drawKafkaIcon;
let drawZookeeperIcon;
let drawCrownIcon;
let drawSkullIcon;
let shadeColor;
let drawBadge;
let deleteBadge;

function prettyPrintBytes(bytes) {
    if(bytes === null || bytes === undefined) return '-';

    const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];

    let val = Math.round(+bytes);

    let i;
    for(i = 0; i < units.length-1; ++i) {
	if(val < 1024) return val + units[i];
	val = Math.round(val / 1024);
    }
    return val + units[i];
}

class Dashboard extends React.Component {
  constructor(props) {
    super(props);

    this.viewRef = React.createRef();
    this.konvaRef = React.createRef();

    this.state = {
      clusters: [],
      loading: true,
      selectedCluster: ClustersService.getSelectedClusterId(),
      selectedTheme: ThemesStore.getTheme().maps,
      stats: {
        topics: '-',
        partitions: '-',
        zookeeper: '-',
        brokers: '-',
        status: '-',
      },
      brokersStats: {},
    };

    this.firstDraw = true;
  }

  componentDidMount() {
    this.themeStore = ThemesStore.watch((data) => {
      if (data.action === 'UPDATE') {
        this.setState({
          selectedTheme: data.theme.maps,
        }, () => {
          this._clearEverythingAndRedraw();
        });
      }
    });
    let clusters;
    ClustersService.getClusters()
      .then(clusters => Promise.all(clusters.map(cluster => {
        return BrokersService.getBrokers(cluster.name, true)
          .then(brokers => {
            cluster.brokers = brokers;
	    cluster.zookeepers = [];
	    if(cluster.zookeeperConnectString) {
	      const [connectString, path] = cluster.zookeeperConnectString.split('/', 2);
	      if(connectString) {
		cluster.zookeepers = connectString.split(',').map(node => {
		  const [host, port] = node.split(':', 2);
		  return {
		    id: '', // TODO: assign proper id. (can't base it on ipv4)
		    host: host,
		    port: port ? Number(port) : 2181
		  };
		});
	      }
	    }
            return cluster;
          });
      })))
      .then((c) => {
        clusters = c;
        return this._loadMetrics();
      })
      .then(() => this._loadClusterStats())
      .then(() => {
        this.setState({
          clusters,
          loading: false
        });
        this._initCanvas();
      }).catch(err => {
	console.error(err);
      });
  }

  async componentDidMount() {
    this.konvaRef.current.addEventListener('DOMMouseScroll', this._onMouseScroll.bind(this), false);
    this.konvaRef.current.addEventListener('mousewheel', this._onMouseScroll.bind(this), false);
    window.addEventListener('resize', this._handleResize.bind(this));
  }

  componentWillUnmount() {
    ThemesStore.unwatch(this.themeStore);
    window.removeEventListener('resize', this._handleResize.bind(this));
  }

  _loadMetrics() {
    return new Promise((resolve, reject) => {
      const wantedMetrics = [
        {
          label: 'Bytes in (per sec)',
          location: 'kafka.server',
          type: 'BrokerTopicMetrics',
          name: 'BytesInPerSec',
        },
        {
          label: 'Bytes out (per sec)',
          location: 'kafka.server',
          type: 'BrokerTopicMetrics',
          name: 'BytesOutPerSec',
        },
        {
          label: 'Messages in (per sec)',
          location: 'kafka.server',
          type: 'BrokerTopicMetrics',
          name: 'MessagesInPerSec',
        },
        {
          label: 'Partition count',
          location: 'kafka.server',
          type: 'ReplicaManager',
          name: 'PartitionCount',
        },
        {
          label: 'Leader count',
          location: 'kafka.server',
          type: 'ReplicaManager',
          name: 'LeaderCount',
        },
        {
          label: 'Under replicated',
          location: 'kafka.server',
          type: 'ReplicaManager',
          name: 'UnderReplicatedPartitions',
        },
        {
          label: 'Active controller',
          location: 'kafka.controller',
          type: 'KafkaController',
          name: 'ActiveControllerCount',
        },
        {
          label: 'Memory Heap',
          location: 'java.lang',
          type: 'Memory',
          name: 'HeapMemoryUsage',
        },
        {
          label: 'Load average',
          location: 'java.lang',
          type: 'OperatingSystem',
          name: null,
        },
      ];

      Promise.all(wantedMetrics.map(metric => MetricsService.getMetrics(metric.location, metric.type, metric.name)))
        .then((brokersMetrics) => {
          const brokersStats = {};
          brokersMetrics.forEach((brokersMetric) => {
            brokersMetric.forEach((brokerMetric) => {
              if (!brokersStats[brokerMetric.brokerId]) brokersStats[brokerMetric.brokerId] = [];
              if (brokerMetric.type === 'ReplicaManager') {
                brokersStats[brokerMetric.brokerId].push({
                  label: wantedMetrics.find(m => m.name === brokerMetric.name).label,
                  key: brokerMetric.name,
                  value: brokerMetric.metrics.Value,
                });
              } else if (brokerMetric.type === 'OperatingSystem') {
                brokersStats[brokerMetric.brokerId].push({
                  label: wantedMetrics.find(m => m.name === brokerMetric.name).label,
                  key: 'LoadAverage',
                  value: parseInt(brokerMetric.metrics.ProcessCpuLoad * 100, 10),
                });
              } else if (brokerMetric.type === 'KafkaController') {
                brokersStats[brokerMetric.brokerId].push({
                  label: 'isActiveController',
                  key: brokerMetric.name,
                  value: brokerMetric.metrics.Value === 1,
                });
              } else if (brokerMetric.type === 'BrokerTopicMetrics') {
                brokersStats[brokerMetric.brokerId].push({
                  label: wantedMetrics.find(m => m.name === brokerMetric.name).label,
                  key: brokerMetric.name,
                  value: brokerMetric.metrics.OneMinuteRate,
                });
              } else if (brokerMetric.type === 'Memory') {
                brokersStats[brokerMetric.brokerId].push({
                  label: wantedMetrics.find(m => m.name === brokerMetric.name).label,
                  key: brokerMetric.name,
                  value: (brokerMetric.metrics.used / brokerMetric.metrics.max * 100).toFixed(1),
                });
              }
            });
          });
          this.setState({ brokersStats });
          resolve();
        })
        .catch(reject);
    });
  }

  _handleResize() {
    this._clearEverythingAndRedraw();
  }

  _clearEverythingAndRedraw() {
    if(this.mainLayer) {
      this.mainLayer.destroy();
      this.mainLayer = null;
    }
    if(this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    this.firstDraw = true;
    if(this.matrix) this.keepMatrix = true;
    this._initCanvas();
  }

  _loadClusterStats() {
    const stats = {
      topics: '-',
      partitions: '-',
      zookeeper: '-',
      brokers: '-',
      status: '-',
    };
    this.setState({ stats });
    return Promise.all([
      new Promise((resolve) => {
        TopicsService.getTopics(true)
          .then((topics) => {
            stats.topics = topics.length;
            stats.partitions = topics.reduce((prev, next) => prev + next.partitions.length, 0);
            this.setState({ stats });
            resolve();
          });
      }),
      new Promise((resolve) => {
        BrokersService.getBrokers(this.state.selectedCluster)
          .then((brokers) => {
            const firstBroker = brokers[0];
            stats.brokers = brokers.length;
            stats.zookeeper = firstBroker && firstBroker.configurations && firstBroker.configurations['zookeeper.connect'] ? firstBroker.configurations['zookeeper.connect'].split(',').length : 0;
            stats.status = 'OK';
            this.setState({ stats });
            resolve();
          });
      }),
    ]);
  }

  _onMouseScroll(event) {
    const prop = event.deltaY ? 'deltaY' : 'detail';
    const oldScale = this.stage.scaleX();
    const mousePointTo = {
      x: this.stage.getPointerPosition().x / oldScale - this.stage.x() / oldScale,
      y: this.stage.getPointerPosition().y / oldScale - this.stage.y() / oldScale,
    };

    let newScale = this.stage.scaleX();
    if (event[prop] > 0 && this.stage.scaleX() > 0.6) {
      newScale = this.stage.scaleX() - 0.1;
    } else if (event[prop] <= 0 && this.stage.scaleX() < 1.4) {
      newScale = this.stage.scaleX() + 0.1;
    }

    this.stage.scale({
      x: newScale,
      y: newScale
    });

    const newPos = {
      x: -(mousePointTo.x - this.stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - this.stage.getPointerPosition().y / newScale) * newScale,
    };

    this.stage.position(newPos);

    this.stage.draw();
  }

  _initCanvas() {
    const konvaContainerRect = this.konvaRef.current.getBoundingClientRect();
    this.stage = new Konva.Stage({
      container: 'konva',
      width: konvaContainerRect.width,
      height: konvaContainerRect.height,
      draggable: true,
      dragBoundFunc: (pos) => {
        const minX = (-this.matrix.length * (hexagonesWidth + hexagonesMargin) + hexagonesWidth / 2 + hexagonesMargin) * this.stage.scaleX();
        const minY = (-this.matrix.length * 87 + 87 / 2 + hexagonesMargin) * this.stage.scaleX();
        let { x, y } = pos;
        if (x >= 0) x = 0;
        if (x - this.stage.getWidth() <= minX) x = minX + this.stage.getWidth();
        if (y - this.stage.getHeight() <= minY) y = minY + this.stage.getHeight();
        if (y >= 0) y = 0;
        return {
          x,
          y,
        };
      },
    });

    this.stage.on('click', this._onStageClick.bind(this));

    this.stage.scale({
      x: 0.8,
      y: 0.8
    });

    if (!this.keepMatrix) {
      this._initMatrix();

      this.clusters = this.state.clusters.reduce((prev, next) => {
        prev.push(next.brokers.map(b => ({
          cluster: next.name,
          type: 'kafka',
          id: b.id,
          state: b.state,
        })));
        prev.push(next.zookeepers.map(z => ({
          cluster: next.name,
          type: 'zookeeper',
          id: z.id
        })));
        return prev;
      }, []);

      const matrixCopy = JSON.parse(JSON.stringify(this.matrix));
      this.clusters.forEach((cluster) => {
        const clusterMatrix = generateClusterMatrix(cluster);
        const freePosition = findMatrixFreePosition(matrixCopy, clusterMatrix.length);
        for (let i = freePosition[0]; i < freePosition[0] + clusterMatrix.length; i += 1) {
          for (let j = freePosition[1]; j < freePosition[1] + clusterMatrix.length; j += 1) {
            matrixCopy[i][j] = clusterMatrix[i - freePosition[0]][j - freePosition[1]];
          }
        }
      });

      // now center clusters
      let topLeft = null;
      const bottomRight = {
        x: 0,
        y: 0
      };
      for (let j = 0; j < this.matrix.length; j += 1) {
        for (let i = 0; i < this.matrix[j].length; i += 1) {
          if (matrixCopy[i][j] !== -2) {
            if (!topLeft) {
              topLeft = {
                x: i,
                y: j
              };
            }
            if (topLeft.x > i) topLeft.x = i;
            if (topLeft.y > j) topLeft.y = j;
            if (bottomRight.x < i) bottomRight.x = i;
            if (bottomRight.y < j) bottomRight.y = j;
          }
        }
      }

      const totalWidth = bottomRight.x - topLeft.x;
      const totalHeight = bottomRight.y - topLeft.y;

      const beginningX = matrixCopy[0].length / 2 - Math.round(totalWidth / 2);
      let beginningY = matrixCopy.length / 2 - Math.round(totalHeight / 2);

      if (beginningY % 2 !== 0) beginningY -= 1;

      for (let i = topLeft.x; i < bottomRight.x + 1; i += 1) {
        for (let j = topLeft.y; j < bottomRight.y + 1; j += 1) {
          this.matrix[beginningX + i][beginningY + j] = matrixCopy[i][j];
        }
      }
    }

    // add canvas element
    this._renderMatrix(this.matrix);
  }

  _initMatrix() {
    const matrixSize = 40;
    this.matrix = [];

    for (let i = 0; i < matrixSize; i += 1) {
      this.matrix[i] = [];
      for (let j = 0; j < matrixSize; j += 1) {
        this.matrix[i][j] = -2;
      }
    }
  }

  _selectCluster(clusterName) {
    ClustersService.setSelectedClusterId(clusterName);
    if (this.state.selectedCluster !== clusterName) {
      this.setState({
        selectedCluster: clusterName,
        stats: {
          topics: '-',
          partitions: '-',
          zookeeper: '-',
          brokers: '-',
          status: '-',
        },
      }, () => {
        this._loadClusterStats();
        this._renderMatrix(this.matrix, true);
        this._focusCluster(clusterName);
      });
    }
  }

  _selectNode(hexagone, node) {
    if (this.selectedNode) {
      this.selectedNode.destroy();
    }
    this.selectedNode = this._generateHexagone(hexagone.position().x, hexagone.position().y, node.type, node.id, true);
    this._drawModal();
  }

  _drawModals(hexagone) {
    this._drawSmallModal(hexagone);
    this.setState({ showModal: true });
  }

  _drawSmallModal(hexagone) {
    let type = null;
    if (hexagone.attrs.type === 'kafka') {
      type = 'brokers';
    } else if (hexagone.attrs.type === 'zookeeper') {
      type = 'zookeepers';
    }
    if (!type) return;
    const group = hexagone.parent || hexagone.attrs.parent;
    this.drawnHoveredNode = this._generateHexagone(group.position().x, group.position().y, group.attrs.type, group.attrs.id, true, false, group.attrs.cluster, group.attrs.badges, group.attrs.state);
    const hoveredNode = this.state.clusters
      .find(c => c.name === this.state.selectedCluster)[type]
      .find(b => b.id === this.drawnHoveredNode.attrs.id);
    if (this.smallModal) {
      this.smallModal.destroy();
    }
    this.smallModal = new Konva.Group({
      x: this.drawnHoveredNode.x() + hexagonesWidth / 2 - 1,
      y: this.drawnHoveredNode.y() - 5,
    });
    const smallModal = new Konva.Rect({
      x: -5,
      y: 2,
      fill: this.state.selectedTheme['layout-colors']['nav-bars'],
      opacity: 0.9,
      width: 400,
      height: hexagone.attrs.badges && hexagone.attrs.badges.length > 0 ? 160 : 126,
      cornerRadius: 7,
    });
    this.smallModal.add(smallModal);

    // title
    this.smallModal.add(newText(76, 36, (type === 'brokers' ? 'Kafka broker ' : 'Zookeeper ') + hoveredNode.id, 28, 'Roboto Condensed', 'bold italic', this.state.selectedTheme['dashboard-colors'][type === 'brokers' ? 'kafka-color' : 'zookeeper-color']));

    // url
    this.smallModal.add(newText(76, 72, `${hoveredNode.host}:${hoveredNode.port}`, 20, 'Roboto Condensed', '', this.state.selectedTheme['layout-colors']['1']));

    if (hexagone.attrs.badges && hexagone.attrs.badges) {
      hexagone.attrs.badges.forEach((badge) => {
        const clone = badge.clone();
        clone.position({
          x: 90,
          y: 123
        });
        this.smallModal.add(clone);
      });
    }

    let mutableX = 0;
    let mutableY = 0;

    this.smallModal.add(new Konva.Line({
      points: [mutableX, mutableY - 1,
        mutableX += 60, mutableY += 35,
        mutableX, mutableY += 60,
        mutableX -= 60, mutableY += 35,
        mutableX -= 54, mutableY -= 33,
      ],
      fill: this.state.selectedTheme['dashboard-colors'].background,
      closed: true,
    }));

    if (type === 'brokers') {
      this.smallModal.add(drawKafkaIcon(167, 22, this.state.selectedTheme['dashboard-colors']['kafka-color']));
    } else {
      this.smallModal.add(drawZookeeperIcon(320, 40, this.state.selectedTheme['dashboard-colors']['zookeeper-color']));
    }
    this.mainLayer.add(this.smallModal);
    this.mainLayer.add(this.drawnHoveredNode);
  }

  _removeModals() {
    if (this.smallModal) {
      this.smallModal.destroy();
      this.smallModal = null;
    }
    if (this.drawnHoveredNode) {
      this.drawnHoveredNode.destroy();
      this.drawnHoveredNode = null;
    }
    this.setState({ showModal: false });
  }

  _focusCluster(cluster) {
    let startX = this.matrix.length;
    let startY = this.matrix.length;
    let endX = 0;
    let endY = 0;
    for (let i = 0; i < this.matrix.length; i += 1) {
      for (let j = 0; j < this.matrix[i].length; j += 1) {
        if (this.matrix[i][j].cluster && this.matrix[i][j].cluster === cluster) {
          if (i < startX) startX = i;
          if (j < startY) startY = j;
          if (i > endX) endX = i;
          if (j > endY) endY = j;
        }
      }
    }

    const centerX = (endX + startX) / 2;
    const centerY = (endY + startY) / 2;

    const newX = (centerX * (hexagonesMargin + hexagonesWidth)) * this.stage.scaleX() - (this.stage.getWidth() / 2);
    const newY = (centerY * (hexagonesMargin + 87)) * this.stage.scaleX() - (this.stage.getHeight() / 2);

    this.stage.position({
      x: -newX,
      y: -newY,
    });
    this.mainLayer.draw();

    if (this.modal && this.selectedNode) {
      this._clearModalAndSelectedNode();
    }
  }

  _onStageClick(e) {
    const group = e.target.parent;
    if ((!group || !group.attrs || group.attrs.type !== 'kafka') && this.modal) {
      this._clearModalAndSelectedNode();
    }
  }

  _clearModalAndSelectedNode() {
    this.modal.destroy();
    this.modal = null;
    this.selectedNode.destroy();
    this.selectedNode = null;
    this.mainLayer.draw();
  }

  _generateHexagone(x, y, type = 'default', id = null, isActive, disabled = false, cluster = null, badges = [], state = 'OK') {
    const group = new Konva.Group({
      x,
      y,
      type,
      id,
      disabled,
      cluster,
      badges,
      deadNode: state !== 'OK',
    });

    let mutableX = 0;
    let mutableY = 0;

    const hexagonesProperties = {
      points: [mutableX += 54, mutableY,
        mutableX += 54, mutableY += 33,
        mutableX, mutableY += 54,
        mutableX -= 54, mutableY += 33,
        mutableX -= 54, mutableY -= 33,
        mutableX, mutableY -= 54,
      ],
      sides: 6,
      fill: this.state.selectedTheme['dashboard-colors'][`${type}-color`],
      stroke: this.state.selectedTheme['dashboard-colors'][`${type}-color`],
      strokeWidth: 0.5,
      closed: true,
      type,
      id,
      isHexagone: true,
      parent: group,
      disabled,
      cluster,
      badges,
      deadNode: state !== 'OK',
    };

    if (isActive) {
      hexagonesProperties.fill = this.state.selectedTheme['dashboard-colors'][type === 'kafka' ? 'kafka-color' : 'zookeeper-color'];
      hexagonesProperties.stroke = this.state.selectedTheme['dashboard-colors'][type === 'kafka' ? 'kafka-color' : 'zookeeper-color'];
    } else if (disabled) {
      hexagonesProperties.fill = this.state.selectedTheme['dashboard-colors']['disabled-background'];
      hexagonesProperties.stroke = this.state.selectedTheme['dashboard-colors']['disabled-background'];
      group.on('click', () => {
        ClustersService.setSelectedClusterId(group.attrs.cluster);
        window.location.reload(true);
      });
    } else {
      switch (type) {
        case 'adjacent':
          hexagonesProperties.fill = this.state.selectedTheme['dashboard-colors']['adjacent-hexagone-bc'];
          hexagonesProperties.stroke = this.state.selectedTheme['dashboard-colors']['adjacent-hexagone-border'];
          break;
        case 'kafka':
        case 'zookeeper':
          hexagonesProperties.fill = this.state.selectedTheme['dashboard-colors'][`${type}-color`];
          hexagonesProperties.stroke = this.state.selectedTheme['dashboard-colors'][`${type}-color`];
          hexagonesProperties.opacity = 0.3;
          break;
        default:
          hexagonesProperties.fill = this.state.selectedTheme['dashboard-colors']['default-hexagone-bc'];
          hexagonesProperties.stroke = this.state.selectedTheme['dashboard-colors']['default-hexagone-border'];
          break;
      }
    }

    const hexagone = new Konva.Line(hexagonesProperties);

    group.add(hexagone);

    if (id === '?' || hexagone.attrs.deadNode) {
      hexagone.fill(this.state.selectedTheme['dashboard-colors']['dead-node']);
      hexagone.stroke(this.state.selectedTheme['dashboard-colors']['dead-node-contrast']);
      const skullIcon = drawSkullIcon(this.state.selectedTheme['dashboard-colors']['dead-node-contrast']);
      skullIcon.position({
        x: (hexagonesWidth - skullIcon.getWidth()) / 2,
        y: (hexagonesHeight - skullIcon.getHeight()) / 2,
      });
      group.add(skullIcon);
    } else {
      if (id) {
        const textId = new Konva.Text({
          y: 15,
          text: id,
          fontSize: 48,
          fontFamily: 'Inconsolata',
          fontStyle: 'bold',
          fill: isActive ? this.state.selectedTheme['dashboard-colors']['kafka-contrast']
            : disabled ? this.state.selectedTheme['dashboard-colors']['disabled-color'] : this.state.selectedTheme['dashboard-colors'][`${type}-color`],
        });
        textId.setAbsolutePosition({
          x: (hexagone.getWidth() - textId.getTextWidth()) / 2,
          y: 20
        });
        group.add(textId);
      }

      if (type && type !== 'default' && type !== 'adjacent') {
        let fontSize = 20;
        const textType = new Konva.Text({
          y: 15,
          text: type.toUpperCase(),
          fontSize,
          fontFamily: 'Roboto Condensed',
          fontStyle: 'italic bold',
          fill: isActive ? this.state.selectedTheme['dashboard-colors']['kafka-contrast']
            : disabled ? this.state.selectedTheme['dashboard-colors']['disabled-color'] : this.state.selectedTheme['dashboard-colors'][`${type}-color`],
        });
        while (textType.getWidth() > hexagone.getWidth() - 24) {
          fontSize -= 1;
          textType.setFontSize(fontSize);
        }
        textType.setAbsolutePosition({
          x: (hexagone.getWidth() - textType.getTextWidth()) / 2,
          y: 72
        });
        group.add(textType);
      }
    }

    return group;
  }

  _findBadges(node, x, y) {
    const badges = [];
    const stats = this.state.brokersStats[node.id];
    if (stats && stats.find(s => s.label === 'isActiveController').value) {
      const icon = drawCrownIcon(this.state.selectedTheme['dashboard-colors'][node.type === 'kafka' ? 'kafka-color' : 'zookeeper-color'], 0.3);
      const badge = drawBadge(x + hexagonesWidth / 2, y + 4,
        this.state.selectedTheme['dashboard-colors'].background,
        this.state.selectedTheme['dashboard-colors'][node.type === 'kafka' ? 'kafka-color' : 'zookeeper-color'],
        0.3,
        node.id, icon);
      badges.push(badge);
    }
    return badges;
  }

  _renderMatrix(matrix, onlyClusters = false) {
    this.mainLayer = this.mainLayer || new Konva.Layer();
    this.clusterHexagones = this.clusterHexagones || [];
    let x;
    const defaultHexagone = this._generateHexagone(0, 0);

    defaultHexagone.cache();

    if (onlyClusters) {
      this.clusterHexagones.forEach((hexagone) => {
        hexagone.destroy();
      });
    }

    const badges = [];

    for (let i = 0; i < matrix.length; i += 1) {
      for (let j = 0; j < matrix[i].length; j += 1) {
        const y = (87 + hexagonesMargin / 1.25) * (j - 1);
        if (j % 2 === 0) {
          x = i * hexagonesWidth + i * hexagonesMargin;
        } else {
          x = i * hexagonesWidth + i * hexagonesMargin - hexagonesWidth / 2 - hexagonesMargin / 2;
        }
        if (matrix[i][j] === -1) {
          if (!onlyClusters) {
            const hexagone = this._generateHexagone(x, y, 'adjacent');
            this.mainLayer.add(hexagone);
          }
        } else if (matrix[i][j] !== -2) {
          const elem = matrix[i][j];
          elem.badges = this._findBadges(elem, x, y);
          const hexagone = this._generateHexagone(x, y, elem.type, elem.id, false, this.state.selectedCluster !== elem.cluster, elem.cluster, elem.badges, elem.state);
          if (this.state.selectedCluster === elem.cluster && elem.type === 'kafka') {
            elem.badges.forEach(badge => badges.push(badge));
            hexagone.on('mouseenter', () => {
              this.stage.container().style.cursor = 'pointer';
            });
            hexagone.on('mouseleave', () => {
              this.stage.container().style.cursor = 'default';
            });
            hexagone.on('click', () => {
              this._selectNode(hexagone, matrix[i][j]);
            });
          }
          this.clusterHexagones.push(hexagone);
          this.mainLayer.add(hexagone);
        } else if (!onlyClusters) {
          const clone = defaultHexagone.clone({
            x,
            y
          });
          this.mainLayer.add(clone);
        }
      }
    }

    this.requestRedraw = false;
    this.lastMouseMoveEvent = null;
    window.addEventListener('redraw', () => {
      this.requestRedraw = false;
      const e = this.lastMouseMoveEvent;
      if (!e) return;
      const oldNode = this.hoveredNode;
      let newNode = e.target;
      if (newNode.className === 'Text') {
        newNode = [...newNode.parent.children].find(c => c.className === 'Line');
      }
      if ((!oldNode && newNode.attrs.isHexagone)
        || (oldNode && oldNode._id !== newNode._id && newNode.attrs.isHexagone)) {
        this._removeModals();

        if (oldNode) {
          oldNode.fill(oldNode.oldColor);
        }

        this.hoveredNode = newNode;
        this.hoveredNode.oldColor = newNode.fill();
        if ((this.hoveredNode.attrs.type === 'zookeeper' || this.hoveredNode.attrs.type === 'kafka') && !newNode.attrs.disabled) {
          deleteBadge(this.activeBadge);
          this.hoveredNode.fill(shadeColor(newNode.fill(), 10));
          this._drawModals(this.hoveredNode);
          if (newNode.attrs.badges.length > 0) {
            this.activeBadge = newNode.attrs.badges[0].clone();
            this.activeBadge.children[1].opacity(1);
            this.mainLayer.add(this.activeBadge);
          }
        } else {
          this.hoveredNode.fill(shadeColor(newNode.fill(), 3));
          deleteBadge(this.activeBadge);
        }
      }
      this.mainLayer.batchDraw();
    });

    this.mainLayer.on('mousemove', (e) => {
      this.lastMouseMoveEvent = e;
      if (!this.requestRedraw) {
        this.requestRedraw = true;
        window.dispatchEvent(new Event('redraw'));
      }
    });

    badges.forEach(badge => this.mainLayer.add(badge));
    this.mainLayer.batchDraw();
    if (!onlyClusters) {
      this.stage.add(this.mainLayer);
    }
    if (this.firstDraw) {
      this._focusCluster(this.state.selectedCluster);
      this.firstDraw = false;
    }
    this.stage.draw();
  }

  _renderModal() {
    const stats = this.state.brokersStats[Number(this.hoveredNode.attrs.id)];

    return !stats ? <div/> : (
      <div className="broker-modal">
        <div className="modal-part">
          <h3 className="modal-part-title">
            DOWNLOAD/UPLOAD
          </h3>
          <div className="modal-part-content">
            <div className="modal-part-line">
              <span className="key">Messages in / s</span>
              <span className="value">{stats.find(s => s.key === 'MessagesInPerSec')
                .value
                .toFixed(0)}</span>
            </div>
            <div className="modal-part-line">
              <span className="key">Bytes in / s</span>
              <span
                className="value"
              >
                {prettyPrintBytes(stats.find(s => s.key === 'BytesInPerSec').value)}
              </span>
            </div>
            <div className="modal-part-line">
              <span className="key">Bytes in / s</span>
              <span
                className="value"
              >
                {prettyPrintBytes(stats.find(s => s.key === 'BytesOutPerSec').value)}
              </span>
            </div>
          </div>
        </div>
        <div className="modal-part">
          <h3 className="modal-part-title">
            PARTITIONS
          </h3>
          <div className="modal-part-content">
            <div className="modal-part-line">
              <span className="key">Partitions</span>
              <span className="value">{stats.find(s => s.key === 'PartitionCount')
                .value
                .toString()}</span>
            </div>
            <div className="modal-part-line">
              <span className="key">Under replicated</span>
              <span
                className="value"
              >
                {stats.find(s => s.key === 'UnderReplicatedPartitions')
                  .value
                  .toString()}
              </span>
            </div>
            <div className="modal-part-line">
              <span className="key">Leaders</span>
              <span className="value">{stats.find(s => s.key === 'LeaderCount')
                .value
                .toString()}</span>
            </div>
          </div>
        </div>
        <div className="modal-part">
          <h3 className="modal-part-title">
            OTHER METRICS
          </h3>
          <div className="modal-part-content">
            <div className="modal-part-line">
              <span className="key">Load average</span>
              <span className="value">{stats.find(s => s.key === 'LoadAverage')
                .value
                .toString()}</span>
            </div>
            <div className="modal-part-line">
              <span className="key">Memory heap</span>
              <span className="value">{stats.find(s => s.key === 'HeapMemoryUsage')
                .value
                .toString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    
    return (
      <div
        className="dashboard-view flex flex-1 relative"
        ref={this.viewRef}
        style={{ background: this.state.selectedTheme['dashboard-colors'].background }}
      >
        <div id="konva" ref={this.konvaRef} className="flex-1"/>
        <div className="context-actions cluster-stats">
          <Link to="/topics">
            <div className="cluster-stat">
              <div className="text">
                <span className="value">{this.state.stats.topics}</span>
                <span className="label">Topics</span>
              </div>
              <div className="icon">
                <TopicsIcon/>
              </div>
            </div>
          </Link>
          <div className="cluster-stat">
            <div className="text">
              <span className="value">{this.state.stats.partitions}</span>
              <span className="label">Partitions</span>
            </div>
            <div className="icon">
              <PartitionIcon/>
            </div>
          </div>
          <div className="cluster-stat">
            <div className="text">
              <span className="value">{this.state.stats.brokers}</span>
              <span className="label">Kafka Brokers</span>
            </div>
            <div className="icon kafka">
              <KafkaIcon/>
            </div>
          </div>
          <div className="cluster-stat">
            <div className="text">
              <span className="value">{this.state.stats.zookeeper}</span>
              <span className="label">Zookeeper</span>
            </div>
            <div className="icon">
              <ZookeeperIcon/>
            </div>
          </div>
          <div className="cluster-stat">
            <div className="text">
              <span className="value">
                <div className="ellipse ellipse-12px green margin-right-8px"/>
                {this.state.stats.status}
              </span>
              <span className="label">Cluster status</span>
            </div>
          </div>
        </div>
        {this.state.loading && <Loader/>}
        {this.state.showModal && this._renderModal()}
      </div>
    );
  }
}

generateClusterMatrix = (cluster) => {
  let maxMatrixSize = 0;
  if (cluster.length === 0) return 0;
  for (let i = 1; ; i += 1) {
    const maxElements = 1 + i * 6;
    maxMatrixSize = i * 2 + 3; // +1 because of center and +2 because of lighter hexagones
    if (i > 100 || maxElements >= cluster.length) {
      break;
    }
  }
  let matrix = [];

  for (let i = 0; i < maxMatrixSize; i += 1) {
    matrix[i] = [];
    for (let j = 0; j < maxMatrixSize; j += 1) {
      matrix[i][j] = -2;
    }
  }

  const center = (maxMatrixSize - 1) / 2 + 1; // size is always odd.
  matrix = fillMatrixWithCluster(matrix, cluster, center, center);

  const positions = ['topLeft', 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left'];

  for (let i = 0; i < maxMatrixSize; i += 1) {
    for (let j = 0; j < maxMatrixSize; j += 1) {
      if (typeof matrix[i][j] === 'object') {
        for (const position of positions) {
          const neighbour = getNeighbourCellPosition(position, i, j);
          if (matrix[neighbour[0]] && typeof matrix[neighbour[0]][neighbour[1]] !== 'object') {
            matrix[neighbour[0]][neighbour[1]] = -1;
          }
        }
      }
    }
  }

  return matrix;
};

findMatrixFreePosition = (matrix, itemsLength) => {
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      if (matrix[j][i - j] === -2 && (i - j) % 2 === 0) {
        let freePosition = true;
        const xLength = j + itemsLength;
        const yLength = i - j + itemsLength;
        for (let x = j; x < xLength; x += 1) {
          for (let y = i - j; y < yLength; y += 1) {
            if (matrix[x][y] !== -2) {
              freePosition = false;
            }
          }
        }
        if (freePosition) {
          return [j, i - j];
        }
      }
    }
  }
  return null;
};

fillMatrixWithCluster = (matrix, cluster, x, y) => {
  const nx = x - 1;
  const ny = y - 1;
  const clusterCopy = JSON.parse(JSON.stringify(cluster));
  const matrixCopy = JSON.parse(JSON.stringify(matrix));
  [matrixCopy[nx][ny]] = clusterCopy;
  clusterCopy.splice(0, 1);
  let center = [nx, ny];
  while (clusterCopy.length > 0) {
    const strSeed = `${clusterCopy[0].type}-${clusterCopy[0].id}`;
    const freeNeighbourPosition = findFreeNeighbourPosition(strSeed, matrixCopy, center[0], center[1]);
    if (freeNeighbourPosition) {
      [matrixCopy[freeNeighbourPosition[0]][freeNeighbourPosition[1]]] = clusterCopy;
      clusterCopy.splice(0, 1);
    } else {
      center = getRandomNeighbourPosition(center[0], center[1]);
    }
  }
  return matrixCopy;
};

const stringTo32BitHash = (str) => {
  let v = 0;
  for (let i = 0; i < str.length; i += 1) {
    v += str.charCodeAt(i) << (i % 24);
  }
  return v % 0xFFFFFFFF;
};

const createRandomGenerator = (seed) => {
  const a = 5486230734; // some big numbers
  const b = 6908969830;
  const m = 9853205067;
  let x = seed;
  // returns a random value 0 <= num < 1
  return function seeder(s = x) { // seed is optional. If supplied sets a new seed
    x = (s * a + b) % m;
    return x / m;
  };
};

const seededShuffleArray = (str, arr) => {
  const rArr = [];
  const random = createRandomGenerator(stringTo32BitHash(str));
  while (arr.length > 1) {
    rArr.push(arr.splice(Math.floor(random() * arr.length), 1)[0]);
  }
  rArr.push(arr[0]);
  return rArr;
};

findFreeNeighbourPosition = (strSeed, matrix, x, y) => {
  const positions = ['topLeft', 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left'];
  const freePosition = seededShuffleArray(strSeed, positions)
    .find((pos) => {
      const neighbour = getNeighbourCellPosition(pos, x, y);
      return matrix[neighbour[0]][neighbour[1]] === -2;
    });
  return getNeighbourCellPosition(freePosition, x, y);
};

getNeighbourCellPosition = (position, x, y) => {
  switch (position) {
    case 'topLeft':
      return y % 2 === 0 ? [x, y - 1] : [x - 1, y - 1];
    case 'topRight':
      return y % 2 === 0 ? [x + 1, y - 1] : [x, y - 1];
    case 'right':
      return y % 2 === 0 ? [x + 1, y] : [x + 1, y];
    case 'bottomRight':
      return y % 2 === 0 ? [x + 1, y + 1] : [x, y + 1];
    case 'bottomLeft':
      return y % 2 === 0 ? [x, y + 1] : [x - 1, y + 1];
    case 'left':
      return y % 2 === 0 ? [x - 1, y] : [x - 1, y];
    default:
      return null;
  }
};

getRandomNeighbourPosition = (x, y) => {
  const positions = ['topLeft', 'topRight', 'right', 'bottomRight', 'bottomLeft', 'left'];
  const position = positions[Math.floor(Math.random() * positions.length)];
  return getNeighbourCellPosition(position, x, y);
};

newText = (x, y, text, fsize, ff, fstyle, color) => new Konva.Text({
  x,
  y,
  text,
  fontSize: fsize,
  fontFamily: ff,
  fontStyle: fstyle,
  fill: color,
});

drawKafkaIcon = (x = 0, y = 0, color = 'black') => new Konva.Shape({
  x,
  y,
  fill: color,
  stroke: color,
  sceneFunc: (ctx) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.transform(1.000000, 0.000000, 0.000000, 1.000000, 0.000000 + x, -250 + y);
    ctx.beginPath();
    ctx.moveTo(8.259028, 296.962500);
    ctx.bezierCurveTo(6.774697, 296.905900, 5.364948, 296.379150, 4.208642, 295.449010);
    ctx.bezierCurveTo(4.027629, 295.303410, 3.630233, 294.926490, 3.479973, 294.757890);
    ctx.bezierCurveTo(2.631753, 293.806150, 2.124409, 292.704680, 1.963011, 291.464460);
    ctx.bezierCurveTo(1.937347, 291.267170, 1.933671, 291.180460, 1.933377, 290.762890);
    ctx.bezierCurveTo(1.933005, 290.242670, 1.942197, 290.128760, 2.019086, 289.699990);
    ctx.bezierCurveTo(2.448399, 287.306100, 4.411863, 285.325200, 6.938275, 284.737160);
    ctx.lineTo(7.130681, 284.692360);
    ctx.lineTo(7.130671, 282.822440);
    ctx.lineTo(7.130659, 280.952510);
    ctx.lineTo(6.957831, 280.923810);
    ctx.bezierCurveTo(6.724467, 280.885110, 6.180111, 280.755250, 5.924065, 280.677270);
    ctx.bezierCurveTo(2.819308, 279.731810, 0.553920, 277.229140, 0.080423, 274.221540);
    ctx.bezierCurveTo(0.011494, 273.783700, 0.001833, 273.637640, 0.002379, 273.041890);
    ctx.bezierCurveTo(0.002934, 272.449560, 0.010150, 272.341980, 0.080654, 271.884010);
    ctx.bezierCurveTo(0.387849, 269.887030, 1.505743, 268.071490, 3.219851, 266.785690);
    ctx.bezierCurveTo(4.303546, 265.972780, 5.603783, 265.415720, 6.983965, 265.173000);
    ctx.lineTo(7.065536, 265.158600);
    ctx.lineTo(7.062176, 263.386440);
    ctx.lineTo(7.058816, 261.614240);
    ctx.lineTo(6.987073, 261.597840);
    ctx.bezierCurveTo(5.357251, 261.224010, 3.927132, 260.277190, 3.005280, 258.961640);
    ctx.bezierCurveTo(2.472954, 258.201990, 2.129224, 257.356130, 1.992070, 256.468300);
    ctx.bezierCurveTo(1.939271, 256.126510, 1.932540, 256.024560, 1.932540, 255.565290);
    ctx.bezierCurveTo(1.932540, 255.105710, 1.939160, 255.004150, 1.992217, 254.661240);
    ctx.bezierCurveTo(2.241213, 253.049550, 3.175149, 251.581900, 4.580348, 250.594080);
    ctx.bezierCurveTo(6.170449, 249.476280, 8.209627, 249.089460, 10.153769, 249.536820);
    ctx.bezierCurveTo(10.983577, 249.727760, 11.808433, 250.092610, 12.498688, 250.573990);
    ctx.bezierCurveTo(12.876805, 250.837680, 13.295106, 251.201810, 13.587047, 251.521410);
    ctx.bezierCurveTo(14.950719, 253.014280, 15.480280, 254.999090, 15.027390, 256.919870);
    ctx.bezierCurveTo(14.796386, 257.899590, 14.297960, 258.829890, 13.586562, 259.609150);
    ctx.bezierCurveTo(13.418837, 259.792890, 13.067231, 260.122090, 12.870135, 260.279970);
    ctx.bezierCurveTo(12.206096, 260.811830, 11.454818, 261.208000, 10.620702, 261.466170);
    ctx.bezierCurveTo(10.483977, 261.508470, 10.270852, 261.566450, 10.147092, 261.594960);
    ctx.lineTo(9.922075, 261.646860);
    ctx.lineTo(9.922075, 263.392540);
    ctx.bezierCurveTo(9.922075, 264.778700, 9.925435, 265.139090, 9.938373, 265.142430);
    ctx.bezierCurveTo(9.947303, 265.144430, 10.066204, 265.166830, 10.202524, 265.191330);
    ctx.bezierCurveTo(11.689174, 265.459360, 13.067514, 266.096370, 14.229960, 267.052670);
    ctx.bezierCurveTo(14.448566, 267.232500, 14.801393, 267.565320, 14.989861, 267.769470);
    ctx.bezierCurveTo(15.075951, 267.862670, 15.164006, 267.957010, 15.185529, 267.978980);
    ctx.lineTo(15.224659, 268.018880);
    ctx.lineTo(16.763874, 267.005870);
    ctx.bezierCurveTo(17.610442, 266.448720, 18.304742, 265.988230, 18.306765, 265.982530);
    ctx.bezierCurveTo(18.308865, 265.976530, 18.287015, 265.887530, 18.258355, 265.783900);
    ctx.bezierCurveTo(18.110542, 265.249500, 18.048923, 264.789730, 18.048923, 264.221170);
    ctx.bezierCurveTo(18.048923, 263.760030, 18.088913, 263.377680, 18.180084, 262.967070);
    ctx.bezierCurveTo(18.405375, 261.952460, 18.880231, 261.036850, 19.601882, 260.225600);
    ctx.bezierCurveTo(19.776861, 260.028900, 20.174062, 259.656380, 20.390672, 259.485810);
    ctx.bezierCurveTo(21.430789, 258.666800, 22.644275, 258.183190, 24.010134, 258.043360);
    ctx.bezierCurveTo(24.177025, 258.026260, 24.327917, 258.021460, 24.681926, 258.021660);
    ctx.bezierCurveTo(25.170131, 258.022070, 25.344302, 258.034060, 25.745054, 258.094860);
    ctx.bezierCurveTo(27.362534, 258.340280, 28.829523, 259.145910, 29.862084, 260.355850);
    ctx.bezierCurveTo(30.645092, 261.273360, 31.119725, 262.349420, 31.270590, 263.549170);
    ctx.bezierCurveTo(31.298970, 263.774870, 31.310100, 264.434320, 31.289720, 264.683470);
    ctx.bezierCurveTo(31.238060, 265.315400, 31.090824, 265.922570, 30.849329, 266.499600);
    ctx.bezierCurveTo(30.752719, 266.730440, 30.508827, 267.192730, 30.369146, 267.409780);
    ctx.bezierCurveTo(29.697392, 268.453590, 28.736665, 269.279620, 27.577805, 269.809780);
    ctx.bezierCurveTo(26.855210, 270.140350, 26.117799, 270.333540, 25.283854, 270.410800);
    ctx.bezierCurveTo(25.011531, 270.436100, 24.401488, 270.439300, 24.134054, 270.416800);
    ctx.bezierCurveTo(23.261932, 270.343700, 22.472620, 270.135480, 21.720819, 269.780070);
    ctx.bezierCurveTo(21.040949, 269.458660, 20.512146, 269.097910, 19.965439, 268.582530);
    ctx.lineTo(19.710177, 268.341890);
    ctx.lineTo(18.178340, 269.348400);
    ctx.bezierCurveTo(17.335830, 269.901970, 16.641582, 270.361610, 16.635565, 270.369800);
    ctx.bezierCurveTo(16.628965, 270.377800, 16.645465, 270.442900, 16.676905, 270.531290);
    ctx.bezierCurveTo(17.263064, 272.174560, 17.265394, 273.897960, 16.683705, 275.546400);
    ctx.bezierCurveTo(16.642205, 275.663970, 16.608055, 275.763920, 16.607825, 275.768450);
    ctx.bezierCurveTo(16.607590, 275.773450, 17.302987, 276.237870, 18.153163, 276.801490);
    ctx.lineTo(19.698938, 277.826240);
    ctx.lineTo(19.959827, 277.580020);
    ctx.bezierCurveTo(20.515698, 277.055400, 21.065069, 276.681870, 21.746925, 276.364950);
    ctx.bezierCurveTo(22.888211, 275.834500, 24.158086, 275.625910, 25.425478, 275.760720);
    ctx.bezierCurveTo(27.174701, 275.946800, 28.755377, 276.767990, 29.864024, 278.066630);
    ctx.bezierCurveTo(30.693361, 279.038100, 31.187076, 280.217900, 31.289738, 281.473590);
    ctx.bezierCurveTo(31.310108, 281.722760, 31.298938, 282.382210, 31.270608, 282.607900);
    ctx.bezierCurveTo(31.085730, 284.078120, 30.409464, 285.371420, 29.295666, 286.384830);
    ctx.bezierCurveTo(28.256028, 287.330760, 26.946948, 287.922560, 25.516794, 288.093160);
    ctx.bezierCurveTo(25.049512, 288.148960, 24.440638, 288.156460, 23.997108, 288.111960);
    ctx.bezierCurveTo(22.907331, 288.002660, 21.925537, 287.672620, 21.016437, 287.110080);
    ctx.bezierCurveTo(19.447613, 286.139340, 18.384986, 284.577070, 18.114626, 282.843850);
    ctx.bezierCurveTo(18.047486, 282.413440, 18.028656, 281.827600, 18.068386, 281.405640);
    ctx.bezierCurveTo(18.102336, 281.045190, 18.185903, 280.607120, 18.278276, 280.305300);
    ctx.bezierCurveTo(18.311756, 280.195890, 18.311766, 280.195650, 18.285776, 280.175840);
    ctx.bezierCurveTo(18.271386, 280.165040, 17.568926, 279.698170, 16.724733, 279.138590);
    ctx.bezierCurveTo(15.441470, 278.287960, 15.187077, 278.123920, 15.173019, 278.137970);
    ctx.bezierCurveTo(15.163819, 278.146970, 15.101799, 278.215270, 15.035289, 278.289170);
    ctx.bezierCurveTo(14.857154, 278.487160, 14.302405, 278.999980, 14.071968, 279.179690);
    ctx.bezierCurveTo(13.235520, 279.832010, 12.336649, 280.307980, 11.335370, 280.628750);
    ctx.bezierCurveTo(10.937176, 280.756310, 10.471452, 280.871300, 10.118957, 280.929070);
    ctx.lineTo(9.987375, 280.950670);
    ctx.lineTo(9.987375, 282.822480);
    ctx.lineTo(9.987375, 284.694280);
    ctx.lineTo(10.134125, 284.727880);
    ctx.bezierCurveTo(11.545031, 285.050950, 12.832296, 285.823240, 13.740149, 286.891300);
    ctx.bezierCurveTo(15.134793, 288.532060, 15.550460, 290.691320, 14.857034, 292.693190);
    ctx.bezierCurveTo(14.671037, 293.230140, 14.345633, 293.840270, 13.995508, 294.308540);
    ctx.bezierCurveTo(13.341835, 295.182770, 12.476181, 295.875250, 11.454884, 296.340940);
    ctx.bezierCurveTo(10.742710, 296.665670, 10.052795, 296.853180, 9.276449, 296.933010);
    ctx.bezierCurveTo(9.128241, 296.948210, 8.524936, 296.979410, 8.500301, 296.973110);
    ctx.bezierCurveTo(8.496731, 296.972200, 8.388120, 296.967110, 8.258978, 296.962310);
    ctx.moveTo(8.819941, 293.749710);
    ctx.bezierCurveTo(9.592335, 293.682710, 10.273971, 293.384620, 10.816149, 292.876820);
    ctx.bezierCurveTo(11.982522, 291.784430, 12.077175, 290.074740, 11.038152, 288.866850);
    ctx.bezierCurveTo(10.927840, 288.738610, 10.707473, 288.532200, 10.570451, 288.428780);
    ctx.bezierCurveTo(9.466531, 287.595600, 7.949529, 287.531530, 6.771953, 288.268340);
    ctx.bezierCurveTo(6.587058, 288.384000, 6.485055, 288.463960, 6.294742, 288.642200);
    ctx.bezierCurveTo(6.056620, 288.865210, 5.917430, 289.034850, 5.755534, 289.299330);
    ctx.bezierCurveTo(5.463698, 289.776100, 5.310900, 290.407970, 5.355822, 290.952260);
    ctx.bezierCurveTo(5.434642, 291.907270, 5.946457, 292.731720, 6.786687, 293.257170);
    ctx.bezierCurveTo(7.384823, 293.631210, 8.123535, 293.810170, 8.819941, 293.749710);
    ctx.moveTo(25.073403, 284.909660);
    ctx.bezierCurveTo(25.796397, 284.826560, 26.459821, 284.513560, 26.978130, 284.010720);
    ctx.bezierCurveTo(27.938073, 283.079440, 28.153442, 281.724670, 27.525431, 280.567960);
    ctx.bezierCurveTo(27.055227, 279.701900, 26.161534, 279.104020, 25.119821, 278.958610);
    ctx.bezierCurveTo(24.907739, 278.929010, 24.438174, 278.929110, 24.232032, 278.958910);
    ctx.bezierCurveTo(23.163844, 279.113030, 22.285701, 279.708560, 21.805748, 280.604330);
    ctx.bezierCurveTo(21.584158, 281.017920, 21.477018, 281.443530, 21.475147, 281.917680);
    ctx.bezierCurveTo(21.473747, 282.268400, 21.519007, 282.545830, 21.628135, 282.855720);
    ctx.bezierCurveTo(21.787537, 283.308410, 22.027378, 283.678110, 22.385693, 284.023460);
    ctx.bezierCurveTo(23.089607, 284.701900, 24.069280, 285.024930, 25.073403, 284.909660);
    ctx.moveTo(9.057651, 277.213800);
    ctx.bezierCurveTo(10.711569, 277.035390, 12.119409, 276.014520, 12.730152, 274.550740);
    ctx.bezierCurveTo(12.853747, 274.254510, 12.942220, 273.924950, 12.995795, 273.561150);
    ctx.bezierCurveTo(13.028395, 273.339830, 13.028695, 272.774390, 12.996351, 272.547130);
    ctx.bezierCurveTo(12.857596, 271.572340, 12.418190, 270.743440, 11.681087, 270.065980);
    ctx.bezierCurveTo(11.307488, 269.722620, 10.968013, 269.497630, 10.502684, 269.285020);
    ctx.bezierCurveTo(9.987606, 269.049670, 9.507572, 268.925390, 8.917776, 268.874690);
    ctx.bezierCurveTo(8.712453, 268.856990, 8.196122, 268.867690, 7.991616, 268.893590);
    ctx.bezierCurveTo(7.010916, 269.018410, 6.137935, 269.414720, 5.439520, 270.052130);
    ctx.bezierCurveTo(4.376342, 271.022450, 3.898714, 272.385950, 4.143989, 273.750490);
    ctx.bezierCurveTo(4.334438, 274.810010, 4.971909, 275.777540, 5.904493, 276.422500);
    ctx.bezierCurveTo(6.583884, 276.892360, 7.397401, 277.173560, 8.246606, 277.232090);
    ctx.bezierCurveTo(8.446179, 277.245890, 8.843446, 277.237090, 9.057651, 277.213690);
    ctx.moveTo(25.138626, 267.196390);
    ctx.bezierCurveTo(26.196494, 267.039300, 27.067439, 266.445160, 27.545203, 265.554680);
    ctx.bezierCurveTo(27.976636, 264.750550, 27.992463, 263.806270, 27.588363, 262.979510);
    ctx.bezierCurveTo(27.345776, 262.483200, 26.940971, 262.038110, 26.452745, 261.730910);
    ctx.bezierCurveTo(26.036752, 261.469150, 25.517551, 261.290940, 25.024996, 261.240850);
    ctx.bezierCurveTo(24.862162, 261.224250, 24.488922, 261.224250, 24.326087, 261.240850);
    ctx.bezierCurveTo(23.723680, 261.302050, 23.096487, 261.553460, 22.627553, 261.921540);
    ctx.bezierCurveTo(21.996555, 262.416830, 21.599678, 263.100040, 21.490452, 263.879070);
    ctx.bezierCurveTo(21.464322, 264.065480, 21.471042, 264.452600, 21.503912, 264.654860);
    ctx.bezierCurveTo(21.701870, 265.872670, 22.652301, 266.849640, 23.922825, 267.141310);
    ctx.bezierCurveTo(24.053993, 267.171310, 24.223931, 267.198310, 24.414655, 267.219310);
    ctx.bezierCurveTo(24.517491, 267.230110, 25.014217, 267.214310, 25.138625, 267.196410);
    ctx.moveTo(9.064597, 258.529590);
    ctx.bezierCurveTo(9.531775, 258.451490, 9.952515, 258.296000, 10.320061, 258.065890);
    ctx.bezierCurveTo(11.091708, 257.582790, 11.590591, 256.843300, 11.730915, 255.974600);
    ctx.bezierCurveTo(11.762415, 255.779540, 11.762355, 255.363510, 11.730772, 255.162150);
    ctx.bezierCurveTo(11.625757, 254.492430, 11.319673, 253.921790, 10.809917, 253.445380);
    ctx.bezierCurveTo(10.531372, 253.185040, 10.298148, 253.028400, 9.954814, 252.871090);
    ctx.bezierCurveTo(9.649611, 252.731240, 9.353469, 252.643430, 9.021667, 252.594390);
    ctx.bezierCurveTo(8.809536, 252.562990, 8.292544, 252.562990, 8.089450, 252.594300);
    ctx.bezierCurveTo(7.166240, 252.736620, 6.393818, 253.197340, 5.887550, 253.907660);
    ctx.bezierCurveTo(5.315081, 254.710870, 5.190255, 255.737350, 5.557111, 256.624970);
    ctx.bezierCurveTo(5.990689, 257.674010, 6.970631, 258.396080, 8.165020, 258.546580);
    ctx.bezierCurveTo(8.368342, 258.572180, 8.866250, 258.562780, 9.064597, 258.529580);

    ctx.fill();
    ctx.restore();
  },
});

drawZookeeperIcon = (x = 0, y = 0, color = 'black') => new Konva.Shape({
  x,
  y,
  fill: color,
  stroke: color,
  sceneFunc: (ctx) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.transform(1.000000, 0.000000, 0.000000, 1.000000, 0.000000, -244.083320);
    ctx.beginPath();
    ctx.moveTo(13.645612, 296.634060);
    ctx.bezierCurveTo(11.909868, 296.362010, 10.665406, 295.837760, 10.119644, 295.148680);
    ctx.bezierCurveTo(9.569270, 294.453770, 8.725377, 291.636730, 8.440777, 289.544380);
    ctx.bezierCurveTo(8.384063, 289.127420, 8.309506, 288.288530, 8.275094, 287.680170);
    ctx.bezierCurveTo(8.240683, 287.071820, 8.194728, 286.545270, 8.172977, 286.510080);
    ctx.bezierCurveTo(8.107102, 286.403490, 8.349173, 286.436580, 9.136821, 286.641960);
    ctx.bezierCurveTo(9.806366, 286.816530, 10.961052, 287.024790, 11.849265, 287.131190);
    ctx.lineTo(12.162390, 287.168690);
    ctx.lineTo(12.162390, 277.418750);
    ctx.lineTo(12.162390, 267.668820);
    ctx.lineTo(11.940119, 267.595420);
    ctx.bezierCurveTo(11.817870, 267.555120, 11.596672, 267.411870, 11.448568, 267.277180);
    ctx.bezierCurveTo(11.300463, 267.142500, 11.038040, 266.955410, 10.865404, 266.861420);
    ctx.bezierCurveTo(10.345663, 266.578460, 10.131179, 265.998790, 10.349333, 265.466680);
    ctx.bezierCurveTo(10.384323, 265.381280, 10.364773, 265.351150, 10.274213, 265.350680);
    ctx.bezierCurveTo(10.206883, 265.350430, 10.000005, 265.279380, 9.814479, 265.192970);
    ctx.bezierCurveTo(8.887622, 264.761400, 8.808008, 263.691360, 9.663200, 263.159740);
    ctx.lineTo(9.990622, 262.956210);
    ctx.lineTo(9.832061, 262.785900);
    ctx.bezierCurveTo(9.599398, 262.536010, 9.525549, 262.360230, 9.525549, 262.056330);
    ctx.bezierCurveTo(9.525549, 261.601180, 9.791535, 261.234860, 10.265943, 261.036640);
    ctx.bezierCurveTo(10.664713, 260.870030, 11.026454, 260.906510, 11.539919, 261.165140);
    ctx.bezierCurveTo(11.791636, 261.291920, 12.019835, 261.395740, 12.047027, 261.395860);
    ctx.bezierCurveTo(12.074217, 261.395970, 12.096467, 260.001830, 12.096467, 258.297780);
    ctx.lineTo(12.096467, 255.199490);
    ctx.lineTo(12.953440, 255.199490);
    ctx.lineTo(13.810413, 255.199490);
    ctx.lineTo(13.810413, 257.529260);
    ctx.bezierCurveTo(13.810413, 258.810640, 13.829553, 260.258060, 13.852933, 260.745750);
    ctx.lineTo(13.895453, 261.632460);
    ctx.lineTo(14.331041, 261.636460);
    ctx.bezierCurveTo(14.827726, 261.640460, 15.033864, 261.728560, 15.769764, 262.247700);
    ctx.bezierCurveTo(16.275723, 262.604610, 16.686996, 263.087900, 16.905919, 263.582820);
    ctx.bezierCurveTo(17.139118, 264.110000, 17.749672, 264.549640, 18.586398, 264.792890);
    ctx.bezierCurveTo(18.967078, 264.903550, 18.974631, 264.903160, 19.077990, 264.767190);
    ctx.bezierCurveTo(19.135720, 264.691190, 19.375781, 264.566460, 19.611449, 264.489940);
    ctx.bezierCurveTo(19.847116, 264.413440, 20.182483, 264.263720, 20.356708, 264.157280);
    ctx.bezierCurveTo(20.530934, 264.050840, 20.700347, 263.980360, 20.733184, 264.000650);
    ctx.bezierCurveTo(20.766024, 264.020950, 21.216761, 263.699670, 21.734830, 263.286710);
    ctx.bezierCurveTo(22.252900, 262.873750, 23.171839, 262.177970, 23.776918, 261.740520);
    ctx.bezierCurveTo(24.387882, 261.298830, 25.589662, 260.317920, 26.479679, 259.534510);
    ctx.bezierCurveTo(27.361117, 258.758640, 28.349277, 257.946170, 28.675584, 257.729010);
    ctx.bezierCurveTo(29.265733, 257.336270, 29.854882, 257.045320, 30.060000, 257.045320);
    ctx.bezierCurveTo(30.119110, 257.045320, 30.225640, 257.014220, 30.296730, 256.976220);
    ctx.bezierCurveTo(30.420233, 256.910120, 30.416005, 256.894720, 30.201720, 256.630140);
    ctx.bezierCurveTo(29.796360, 256.129620, 29.760231, 255.994070, 29.526067, 254.095430);
    ctx.bezierCurveTo(29.507057, 253.941340, 29.467937, 253.815270, 29.439117, 253.815270);
    ctx.bezierCurveTo(29.321114, 253.815270, 28.759805, 253.327930, 28.617588, 253.102010);
    ctx.bezierCurveTo(28.498766, 252.913250, 28.456877, 252.730020, 28.428812, 252.276320);
    ctx.bezierCurveTo(28.408982, 251.955630, 28.359972, 251.660470, 28.319921, 251.620410);
    ctx.bezierCurveTo(28.199562, 251.500050, 28.234251, 251.257320, 28.378351, 251.211580);
    ctx.bezierCurveTo(28.450541, 251.188680, 28.539533, 251.188380, 28.576113, 251.211030);
    ctx.bezierCurveTo(28.659683, 251.262630, 28.659633, 251.260930, 28.543743, 250.189620);
    ctx.bezierCurveTo(28.490793, 249.700160, 28.446893, 249.280270, 28.446173, 249.256540);
    ctx.bezierCurveTo(28.445394, 249.232840, 28.286276, 249.123890, 28.092445, 249.014500);
    ctx.bezierCurveTo(27.498527, 248.679310, 27.062325, 248.078380, 27.060890, 247.593390);
    ctx.bezierCurveTo(27.059090, 247.043060, 27.572757, 246.425400, 28.510210, 245.850070);
    ctx.bezierCurveTo(29.195316, 245.429620, 29.897034, 245.153210, 30.850978, 244.928040);
    ctx.bezierCurveTo(31.491098, 244.776940, 31.719085, 244.756550, 32.795648, 244.754010);
    ctx.bezierCurveTo(34.110827, 244.751010, 34.635677, 244.825010, 35.663212, 245.158750);
    ctx.bezierCurveTo(37.119450, 245.631760, 38.301713, 246.513750, 38.843899, 247.531600);
    ctx.bezierCurveTo(39.020317, 247.862800, 39.058143, 248.007060, 39.058143, 248.348730);
    ctx.bezierCurveTo(39.058143, 249.089690, 38.646300, 249.632740, 37.735928, 250.092180);
    ctx.bezierCurveTo(37.498174, 250.212170, 37.263372, 250.358870, 37.214147, 250.418180);
    ctx.bezierCurveTo(37.135967, 250.512380, 37.155197, 250.551220, 37.366263, 250.725190);
    ctx.bezierCurveTo(37.553418, 250.879460, 37.607879, 250.972310, 37.607879, 251.137090);
    ctx.bezierCurveTo(37.607879, 251.254100, 37.578289, 251.379420, 37.542129, 251.415580);
    ctx.bezierCurveTo(37.498419, 251.459280, 37.499509, 251.665780, 37.545429, 252.031760);
    ctx.bezierCurveTo(37.603819, 252.497380, 37.598009, 252.623870, 37.507719, 252.852650);
    ctx.bezierCurveTo(37.392397, 253.144880, 36.781022, 253.815280, 36.629835, 253.815280);
    ctx.bezierCurveTo(36.552195, 253.815280, 36.544935, 253.980400, 36.584995, 254.835110);
    ctx.lineTo(36.632795, 255.854940);
    ctx.lineTo(36.420992, 256.202960);
    ctx.bezierCurveTo(36.304502, 256.394380, 36.151663, 256.613760, 36.081353, 256.690470);
    ctx.lineTo(35.953514, 256.829950);
    ctx.lineTo(36.566469, 257.222840);
    ctx.bezierCurveTo(36.903594, 257.438930, 37.298081, 257.684770, 37.443109, 257.769160);
    ctx.bezierCurveTo(37.588133, 257.853560, 37.736692, 257.955130, 37.773235, 257.994890);
    ctx.bezierCurveTo(37.809775, 258.034590, 37.983707, 258.139820, 38.159744, 258.228620);
    ctx.bezierCurveTo(38.622349, 258.461960, 39.056062, 258.879010, 39.338668, 259.362240);
    ctx.bezierCurveTo(39.499345, 259.636990, 39.664437, 259.826590, 39.812330, 259.906230);
    ctx.bezierCurveTo(40.383785, 260.213990, 40.925284, 260.986500, 41.011754, 261.617360);
    ctx.bezierCurveTo(41.048964, 261.888840, 41.073614, 261.918730, 41.377681, 262.061140);
    ctx.bezierCurveTo(41.556999, 262.145140, 41.801998, 262.322650, 41.922129, 262.455610);
    ctx.bezierCurveTo(42.136161, 262.692520, 42.338618, 263.147710, 42.263410, 263.222920);
    ctx.bezierCurveTo(42.242500, 263.243820, 42.317980, 263.366420, 42.431157, 263.495320);
    ctx.bezierCurveTo(42.803201, 263.919050, 42.914486, 264.255590, 42.914146, 264.955920);
    ctx.bezierCurveTo(42.913896, 265.665830, 42.955686, 265.558740, 42.095806, 267.047790);
    ctx.bezierCurveTo(41.797811, 267.563820, 41.570987, 268.013520, 41.591753, 268.047130);
    ctx.bezierCurveTo(41.612503, 268.080730, 41.568163, 268.251380, 41.493153, 268.426340);
    ctx.bezierCurveTo(41.418153, 268.601300, 41.336435, 268.908040, 41.311552, 269.107980);
    ctx.lineTo(41.266312, 269.471510);
    ctx.lineTo(40.739053, 269.491410);
    ctx.lineTo(40.211794, 269.511310);
    ctx.lineTo(39.869663, 270.117610);
    ctx.bezierCurveTo(39.546033, 270.691130, 39.533637, 270.730140, 39.640460, 270.838970);
    ctx.bezierCurveTo(39.732510, 270.932770, 39.794490, 270.942230, 39.975754, 270.890270);
    ctx.bezierCurveTo(40.232297, 270.816670, 40.626068, 270.886270, 40.876500, 271.051090);
    ctx.bezierCurveTo(40.968700, 271.111490, 41.098298, 271.285090, 41.164500, 271.436840);
    ctx.bezierCurveTo(41.230700, 271.588590, 41.349678, 271.751450, 41.428888, 271.798750);
    ctx.bezierCurveTo(41.592460, 271.896450, 41.777197, 272.285840, 41.724773, 272.422460);
    ctx.bezierCurveTo(41.704193, 272.476060, 41.755713, 272.543260, 41.850477, 272.586440);
    ctx.bezierCurveTo(41.938787, 272.626640, 42.094488, 272.769010, 42.196490, 272.902740);
    ctx.bezierCurveTo(42.450342, 273.235550, 42.496858, 273.841920, 42.298382, 274.230960);
    ctx.bezierCurveTo(42.049668, 274.718480, 41.526719, 275.217760, 40.983721, 275.486120);
    ctx.bezierCurveTo(40.495544, 275.727400, 40.463092, 275.733940, 39.753764, 275.733940);
    ctx.bezierCurveTo(39.094114, 275.733940, 38.987811, 275.716540, 38.629691, 275.549470);
    ctx.bezierCurveTo(38.412150, 275.448010, 38.123970, 275.276890, 37.989289, 275.169190);
    ctx.lineTo(37.744418, 274.973380);
    ctx.lineTo(37.642562, 275.170340);
    ctx.bezierCurveTo(37.544822, 275.359350, 37.549192, 275.381370, 37.750596, 275.715430);
    ctx.bezierCurveTo(38.067421, 276.240900, 38.504049, 276.731740, 38.897731, 277.004980);
    ctx.bezierCurveTo(39.343013, 277.314020, 39.370245, 277.480430, 38.975771, 277.481850);
    ctx.bezierCurveTo(38.553645, 277.482850, 38.515780, 277.532950, 38.673402, 277.877870);
    ctx.bezierCurveTo(38.837006, 278.235880, 39.058172, 278.977580, 39.058172, 279.168270);
    ctx.bezierCurveTo(39.058172, 279.244570, 39.209337, 279.506650, 39.394094, 279.750710);
    ctx.bezierCurveTo(39.689708, 280.141210, 39.725021, 280.221100, 39.688363, 280.416490);
    ctx.bezierCurveTo(39.654843, 280.595180, 39.698653, 280.741830, 39.912770, 281.167690);
    ctx.bezierCurveTo(40.059104, 281.458740, 40.178828, 281.723850, 40.178828, 281.756830);
    ctx.bezierCurveTo(40.178828, 281.789830, 39.988846, 282.213200, 39.756645, 282.697670);
    ctx.bezierCurveTo(39.391211, 283.460130, 39.348358, 283.587400, 39.437852, 283.644450);
    ctx.bezierCurveTo(39.494712, 283.680750, 39.632045, 283.788860, 39.743022, 283.884770);
    ctx.bezierCurveTo(39.930412, 284.046740, 39.938422, 284.071070, 39.855403, 284.226200);
    ctx.bezierCurveTo(39.806243, 284.318100, 39.633779, 284.450460, 39.472156, 284.520420);
    ctx.lineTo(39.178298, 284.647630);
    ctx.lineTo(39.488764, 284.725830);
    ctx.bezierCurveTo(39.954333, 284.843060, 40.583751, 285.149610, 40.791610, 285.360370);
    ctx.bezierCurveTo(41.175959, 285.750070, 40.834710, 286.053630, 39.955400, 286.104220);
    ctx.bezierCurveTo(39.446588, 286.133520, 39.406614, 286.147420, 39.128657, 286.391750);
    ctx.bezierCurveTo(38.786830, 286.692250, 38.161982, 287.005130, 37.682786, 287.115740);
    ctx.bezierCurveTo(37.496576, 287.158740, 37.343157, 287.211040, 37.341854, 287.232010);
    ctx.bezierCurveTo(37.340554, 287.253010, 37.301314, 287.559520, 37.254674, 287.913230);
    ctx.bezierCurveTo(37.176804, 288.503710, 37.179194, 288.564780, 37.283904, 288.659550);
    ctx.bezierCurveTo(37.613590, 288.957900, 37.803727, 289.888490, 37.677029, 290.583610);
    ctx.bezierCurveTo(37.593909, 291.039650, 37.625579, 291.130680, 37.958541, 291.392580);
    ctx.lineTo(38.135353, 291.531660);
    ctx.lineTo(38.507795, 291.361160);
    ctx.bezierCurveTo(38.712639, 291.267360, 39.166304, 290.984990, 39.515939, 290.733620);
    ctx.bezierCurveTo(40.247711, 290.207540, 40.384930, 290.144770, 40.969877, 290.068590);
    ctx.bezierCurveTo(42.485317, 289.871210, 43.990764, 290.828800, 44.194870, 292.119970);
    ctx.bezierCurveTo(44.224000, 292.304220, 44.220500, 292.860900, 44.187070, 293.357040);
    ctx.lineTo(44.126360, 294.259110);
    ctx.lineTo(44.426845, 294.572720);
    ctx.bezierCurveTo(44.692614, 294.850090, 44.727328, 294.920610, 44.727328, 295.183110);
    ctx.bezierCurveTo(44.727328, 295.554170, 44.495409, 295.943790, 44.189069, 296.087380);
    ctx.bezierCurveTo(43.871696, 296.236140, 42.980613, 296.387120, 41.969873, 296.463380);
    ctx.bezierCurveTo(41.333155, 296.511380, 40.153140, 296.502780, 37.685008, 296.432080);
    ctx.bezierCurveTo(33.563291, 296.313940, 33.098950, 296.260480, 32.766907, 295.865860);
    ctx.bezierCurveTo(32.647542, 295.724010, 32.597866, 295.588010, 32.597866, 295.403070);
    ctx.bezierCurveTo(32.597866, 295.136510, 32.738300, 294.782300, 32.860099, 294.741670);
    ctx.bezierCurveTo(32.900969, 294.728070, 32.875669, 294.583240, 32.795559, 294.372440);
    ctx.bezierCurveTo(32.651822, 293.994180, 32.623870, 293.415300, 32.730759, 293.030500);
    ctx.bezierCurveTo(32.767189, 292.899330, 32.927798, 292.592870, 33.087660, 292.349480);
    ctx.bezierCurveTo(33.478362, 291.754630, 33.546071, 291.437240, 33.488099, 290.472390);
    ctx.bezierCurveTo(33.429999, 289.505530, 33.527559, 289.086650, 33.901290, 288.698140);
    ctx.bezierCurveTo(34.036434, 288.557660, 34.190373, 288.428940, 34.243383, 288.412110);
    ctx.bezierCurveTo(34.323653, 288.386610, 34.327153, 288.338210, 34.264333, 288.122470);
    ctx.bezierCurveTo(34.222843, 287.980010, 34.140807, 287.694650, 34.082025, 287.488350);
    ctx.bezierCurveTo(33.985065, 287.148060, 33.952534, 287.105940, 33.731470, 287.034390);
    ctx.bezierCurveTo(33.334303, 286.905840, 32.850286, 286.643890, 32.506852, 286.371610);
    ctx.bezierCurveTo(32.208064, 286.134740, 32.093457, 286.085890, 31.894210, 286.110470);
    ctx.bezierCurveTo(31.772006, 286.125570, 31.731198, 285.893850, 31.800850, 285.580380);
    ctx.bezierCurveTo(31.925794, 285.018040, 32.068356, 283.723070, 32.110481, 282.767820);
    ctx.bezierCurveTo(32.152151, 281.823040, 32.049061, 279.777400, 31.952303, 279.628930);
    ctx.bezierCurveTo(31.926673, 279.589630, 31.842772, 278.830630, 31.765860, 277.942340);
    ctx.bezierCurveTo(31.680430, 276.955700, 31.622476, 276.506830, 31.616913, 276.788720);
    ctx.bezierCurveTo(31.562613, 279.540040, 31.284621, 283.418680, 31.101922, 283.974110);
    ctx.bezierCurveTo(31.042292, 284.155390, 30.879856, 284.433970, 30.740953, 284.593170);
    ctx.bezierCurveTo(30.602047, 284.752360, 30.488397, 284.902920, 30.488397, 284.927760);
    ctx.bezierCurveTo(30.488397, 284.952660, 30.562557, 285.042570, 30.653200, 285.127730);
    ctx.bezierCurveTo(30.785174, 285.251710, 30.816695, 285.342640, 30.811432, 285.584190);
    ctx.bezierCurveTo(30.803132, 285.964140, 30.756882, 286.109840, 30.569976, 286.344610);
    ctx.lineTo(30.420830, 286.531940);
    ctx.lineTo(30.196253, 286.411010);
    ctx.lineTo(29.971677, 286.290060);
    ctx.lineTo(29.620268, 286.561000);
    ctx.bezierCurveTo(29.147241, 286.925710, 28.517242, 287.214760, 27.910773, 287.345330);
    ctx.lineTo(27.409658, 287.453220);
    ctx.lineTo(27.282942, 287.849360);
    ctx.lineTo(27.156227, 288.245500);
    ctx.lineTo(27.305979, 288.548880);
    ctx.bezierCurveTo(27.491446, 288.924620, 27.597562, 289.718860, 27.529404, 290.221110);
    ctx.bezierCurveTo(27.501184, 290.429040, 27.500134, 290.599170, 27.527104, 290.599170);
    ctx.bezierCurveTo(27.656495, 290.599170, 28.273854, 291.169060, 28.475591, 291.474730);
    ctx.bezierCurveTo(28.790134, 291.951320, 28.834258, 292.241440, 28.778556, 293.466730);
    ctx.bezierCurveTo(28.730836, 294.516460, 28.731346, 294.522160, 28.885060, 294.667270);
    ctx.bezierCurveTo(29.081904, 294.853080, 29.170015, 295.086510, 29.170015, 295.422210);
    ctx.bezierCurveTo(29.170015, 295.722760, 29.008228, 296.112830, 28.848298, 296.197870);
    ctx.bezierCurveTo(28.648041, 296.304360, 27.490676, 296.522100, 26.697977, 296.602410);
    ctx.bezierCurveTo(25.139669, 296.760300, 22.357225, 296.533010, 21.918705, 296.212080);
    ctx.bezierCurveTo(21.333646, 295.783850, 21.303621, 295.036760, 21.854155, 294.605910);
    ctx.lineTo(22.055900, 294.448010);
    ctx.lineTo(21.985720, 293.579200);
    ctx.bezierCurveTo(21.884508, 292.326110, 21.980120, 291.853400, 22.457690, 291.245630);
    ctx.bezierCurveTo(22.686391, 290.954580, 23.350373, 290.497940, 23.695038, 290.394680);
    ctx.lineTo(23.942316, 290.320580);
    ctx.lineTo(23.941016, 289.685300);
    ctx.bezierCurveTo(23.939416, 288.920970, 24.077266, 288.394440, 24.357311, 288.094660);
    ctx.lineTo(24.555155, 287.882860);
    ctx.lineTo(24.427217, 287.383440);
    ctx.bezierCurveTo(24.356847, 287.108760, 24.254512, 286.858970, 24.199797, 286.828360);
    ctx.bezierCurveTo(23.686332, 286.541000, 23.165141, 285.924490, 23.038688, 285.454880);
    ctx.bezierCurveTo(22.996798, 285.299300, 22.894869, 285.146680, 22.776637, 285.062490);
    ctx.bezierCurveTo(22.670216, 284.986690, 22.520754, 284.837090, 22.444500, 284.730010);
    ctx.lineTo(22.305857, 284.535300);
    ctx.lineTo(22.466988, 284.386540);
    ctx.bezierCurveTo(22.729020, 284.144630, 23.698558, 282.971960, 23.698558, 282.896940);
    ctx.bezierCurveTo(23.698558, 282.858940, 23.520571, 282.748000, 23.303032, 282.650370);
    ctx.bezierCurveTo(23.085493, 282.552770, 22.907506, 282.456400, 22.907506, 282.436270);
    ctx.bezierCurveTo(22.907506, 282.416170, 23.026504, 282.199370, 23.171948, 281.954550);
    ctx.bezierCurveTo(23.534752, 281.343860, 24.011660, 280.102590, 24.225926, 279.211310);
    ctx.lineTo(24.404211, 278.469700);
    ctx.lineTo(24.084350, 278.469700);
    ctx.bezierCurveTo(23.908423, 278.469700, 23.764484, 278.454300, 23.764484, 278.435400);
    ctx.bezierCurveTo(23.764484, 278.416600, 24.016631, 277.999270, 24.324812, 277.508150);
    ctx.lineTo(24.885140, 276.615190);
    ctx.lineTo(24.885140, 275.999140);
    ctx.bezierCurveTo(24.885140, 275.445580, 24.907690, 275.330680, 25.107491, 274.866360);
    ctx.bezierCurveTo(25.610172, 273.698170, 26.563814, 271.623620, 26.748993, 271.295460);
    ctx.bezierCurveTo(26.940394, 270.956270, 26.944516, 270.931670, 26.867583, 270.587890);
    ctx.bezierCurveTo(26.804893, 270.307770, 26.746611, 270.207350, 26.594599, 270.117550);
    ctx.bezierCurveTo(26.404547, 270.005290, 26.401323, 269.993870, 26.401323, 269.433310);
    ctx.bezierCurveTo(26.401323, 269.119760, 26.370303, 268.703440, 26.332393, 268.508140);
    ctx.bezierCurveTo(26.294483, 268.312850, 26.282693, 267.981380, 26.306183, 267.771560);
    ctx.bezierCurveTo(26.341433, 267.456810, 26.401003, 267.320760, 26.646644, 266.993970);
    ctx.bezierCurveTo(26.814666, 266.770450, 26.998397, 266.424340, 27.068371, 266.199510);
    ctx.bezierCurveTo(27.280721, 265.517230, 27.205029, 264.736140, 26.907689, 264.541310);
    ctx.bezierCurveTo(26.762870, 264.446410, 26.673472, 264.503210, 24.490573, 266.076800);
    ctx.bezierCurveTo(22.505504, 267.507780, 22.185821, 267.715870, 21.917906, 267.751420);
    ctx.bezierCurveTo(21.749644, 267.773720, 21.163989, 267.982960, 20.616449, 268.216360);
    ctx.bezierCurveTo(19.797582, 268.565410, 19.578731, 268.633870, 19.383170, 268.602140);
    ctx.bezierCurveTo(19.088270, 268.554340, 18.906952, 268.335660, 18.850623, 267.960020);
    ctx.lineTo(18.808233, 267.677380);
    ctx.lineTo(18.237506, 267.636980);
    ctx.bezierCurveTo(17.923606, 267.614780, 17.503623, 267.550780, 17.304212, 267.494830);
    ctx.bezierCurveTo(16.640960, 267.308630, 16.025686, 267.298090, 15.260661, 267.459830);
    ctx.bezierCurveTo(14.879968, 267.540330, 14.518528, 267.632800, 14.457463, 267.665340);
    ctx.bezierCurveTo(14.396403, 267.697840, 14.235772, 267.724540, 14.100517, 267.724540);
    ctx.lineTo(13.854666, 267.724540);
    ctx.lineTo(13.898446, 273.410230);
    ctx.bezierCurveTo(13.922526, 276.537360, 13.942246, 280.945210, 13.942266, 283.205460);
    ctx.lineTo(13.942308, 287.315010);
    ctx.lineTo(15.251538, 287.292510);
    ctx.lineTo(16.560767, 287.270010);
    ctx.lineTo(16.641787, 287.896260);
    ctx.bezierCurveTo(16.848946, 289.497540, 17.288567, 291.460450, 17.778608, 292.972180);
    ctx.bezierCurveTo(18.092561, 293.940690, 18.316368, 294.402820, 18.683973, 294.841620);
    ctx.bezierCurveTo(18.883751, 295.080090, 18.952305, 295.219870, 18.952305, 295.388750);
    ctx.bezierCurveTo(18.952305, 296.055250, 18.334520, 296.481590, 17.139806, 296.639590);
    ctx.bezierCurveTo(16.321688, 296.747780, 14.351617, 296.744620, 13.645665, 296.633590);
    ctx.moveTo(37.691738, 267.706060);
    ctx.bezierCurveTo(37.661828, 267.440700, 37.716178, 267.308700, 38.390542, 266.008960);
    ctx.bezierCurveTo(39.051253, 264.735520, 39.113232, 264.586570, 39.033150, 264.464590);
    ctx.bezierCurveTo(38.867749, 264.212650, 38.519387, 263.913910, 38.194382, 263.745290);
    ctx.lineTo(37.870511, 263.577260);
    ctx.lineTo(37.900591, 263.722700);
    ctx.bezierCurveTo(37.917131, 263.802700, 37.963421, 264.072270, 38.003443, 264.321770);
    ctx.lineTo(38.076213, 264.775380);
    ctx.lineTo(37.852645, 264.980980);
    ctx.lineTo(37.629078, 265.186570);
    ctx.lineTo(37.585708, 266.439060);
    ctx.bezierCurveTo(37.561868, 267.127940, 37.544238, 267.884380, 37.546568, 268.120050);
    ctx.lineTo(37.550868, 268.548540);
    ctx.lineTo(37.637558, 268.271170);
    ctx.bezierCurveTo(37.685238, 268.118620, 37.709648, 267.864330, 37.691818, 267.706060);
    ctx.fill();
    ctx.restore();
  },
});

drawCrownIcon = (color = 'black') => new Konva.Shape({
  x: -6,
  y: -4,
  sceneFunc: (ctx) => {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 0.261734;
    ctx.fillStyle = color;
    ctx.moveTo(12.170834, 0);
    ctx.lineTo(10.142362, 3.175);
    ctx.lineTo(8.113889, 0);
    ctx.lineTo(6.085416, 3.175);
    ctx.lineTo(4.056945, 0);
    ctx.lineTo(2.028473, 3.175);
    ctx.lineTo(0.000000, 0);
    ctx.lineTo(0.000000, 3.175);
    ctx.lineTo(0.000000, 6.35);
    ctx.lineTo(12.168180, 6.35);
    ctx.moveTo(0.002655, 8);
    ctx.lineTo(12.170834, 8);
    ctx.lineTo(12.170834, 7);
    ctx.lineTo(0.002655, 7);
    ctx.fill();
    ctx.restore();
  },
});

drawSkullIcon = (color = 'black', x = 0, y = 0) => {
  const scale = 1.5;
  return new Konva.Shape({
    x,
    y,
    width: 40 * scale,
    height: 46 * scale,
    sceneFunc: (ctx) => {
      ctx.scale(scale, scale);
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 0.261734;
      ctx.fillStyle = color;
      ctx.moveTo(23.163214, 17.765656);
      ctx.bezierCurveTo(23.163214, 14.885010, 25.517938, 12.546367, 28.418393, 12.546367);
      ctx.bezierCurveTo(31.328954, 12.546367, 33.683679, 14.885010, 33.683679, 17.765656);
      ctx.bezierCurveTo(33.683679, 20.656339, 33.431026, 22.994981, 30.530571, 22.994981);
      ctx.bezierCurveTo(27.620010, 22.994981, 23.163214, 20.656339, 23.163214, 17.765656);
      ctx.moveTo(22.789288, 29.268165);
      ctx.lineTo(20.687216, 29.268165);
      ctx.lineTo(21.424962, 25.092734);
      ctx.lineTo(23.527034, 25.092734);
      ctx.moveTo(18.575038, 25.092734);
      ctx.lineTo(19.322890, 29.268165);
      ctx.lineTo(17.210712, 29.268165);
      ctx.lineTo(16.472966, 25.092734);
      ctx.moveTo(16.846892, 17.765656);
      ctx.bezierCurveTo(16.846892, 20.656339, 12.379990, 22.994981, 9.469429, 22.994981);
      ctx.bezierCurveTo(6.568974, 22.994981, 6.316321, 20.656339, 6.316321, 17.765656);
      ctx.bezierCurveTo(6.316321, 14.885010, 8.671046, 12.546367, 11.581607, 12.546367);
      ctx.bezierCurveTo(14.482062, 12.546367, 16.846892, 14.885010, 16.846892, 17.765656);
      ctx.moveTo(40.000000, 19.863408);
      ctx.bezierCurveTo(40.000000, 19.502073, 40.000000, 19.170849, 39.979790, 18.819551);
      ctx.bezierCurveTo(39.434058, 8.320751, 30.692269, 0.000000, 20.000000, 0.000000);
      ctx.bezierCurveTo(9.307731, 0.000000, 0.565942, 8.320751, 0.020212, 18.819551);
      ctx.bezierCurveTo(0.000000, 19.170849, 0.000000, 19.502073, 0.000000, 19.863408);
      ctx.lineTo(1.283476, 24.841807);
      ctx.bezierCurveTo(0.505306, 25.735108, 0.000000, 29.017238, 0.000000, 30.312023);
      ctx.bezierCurveTo(0.000000, 33.202706, 2.354725, 35.541348, 5.265286, 35.541348);
      ctx.bezierCurveTo(5.457302, 35.541348, 5.619000, 35.501198, 5.790803, 35.481128);
      ctx.bezierCurveTo(5.962607, 35.521278, 6.124305, 35.541348, 6.316321, 35.541348);
      ctx.lineTo(8.418393, 39.726816);
      ctx.lineTo(14.734715, 39.726816);
      ctx.lineTo(14.734715, 35.541348);
      ctx.lineTo(16.846892, 35.541348);
      ctx.lineTo(16.846892, 39.726816);
      ctx.lineTo(23.163214, 39.726816);
      ctx.lineTo(23.163214, 35.541348);
      ctx.lineTo(25.265285, 35.541348);
      ctx.lineTo(25.265285, 39.726816);
      ctx.lineTo(31.581607, 39.726816);
      ctx.lineTo(33.683679, 35.541348);
      ctx.bezierCurveTo(33.875695, 35.541348, 34.047499, 35.521278, 34.209197, 35.481128);
      ctx.bezierCurveTo(34.381001, 35.501198, 34.552804, 35.541348, 34.734715, 35.541348);
      ctx.bezierCurveTo(37.645275, 35.541348, 40.000000, 33.202706, 40.000000, 30.312023);
      ctx.bezierCurveTo(40.000000, 29.017238, 39.494694, 25.735108, 38.716523, 24.841807);
      ctx.moveTo(0.020212, 18.819551);
      ctx.bezierCurveTo(0.000000, 19.170849, 0.000000, 19.502073, 0.000000, 19.863408);
      ctx.lineTo(0.000000, 18.819551);
      ctx.moveTo(40.000000, 18.819551);
      ctx.lineTo(40.000000, 19.863408);
      ctx.bezierCurveTo(40.000000, 19.502073, 40.000000, 19.170849, 39.979790, 18.819551);
      ctx.moveTo(14.734715, 46.000000);
      ctx.lineTo(10.530571, 46.000000);
      ctx.lineTo(8.418393, 41.814532);
      ctx.lineTo(14.734715, 41.814532);
      ctx.moveTo(23.163214, 46.000000);
      ctx.lineTo(16.846892, 46.000000);
      ctx.lineTo(16.846892, 41.814532);
      ctx.lineTo(23.163214, 41.814532);
      ctx.moveTo(29.479535, 46.000000);
      ctx.lineTo(25.265285, 46.000000);
      ctx.lineTo(25.265285, 41.814532);
      ctx.lineTo(31.581607, 41.814532);
      ctx.fill();
      ctx.restore();
    },
  });
};

shadeColor = (color, percent) => { // deprecated. See below.
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const
    B = (num & 0x0000FF) + amt;
  return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16)
    .slice(1)}`;
};

drawBadge = (x, y, fill, stroke, strokeOpacity, nodeId, icon) => {
  const group = new Konva.Group({
    x,
    y,
    nodeId
  });
  group.add(new Konva.Circle({
    radius: 12,
    fill,
    opacity: 1,
    stroke: fill,
    strokeWidth: 2,
  }));
  group.add(new Konva.Circle({
    radius: 12,
    opacity: strokeOpacity,
    stroke,
    strokeWidth: 2,
  }));
  if (icon) group.add(icon);
  return group;
};

deleteBadge = (badge) => {
  if (badge && badge.remove && badge.destroy) {
    badge.remove();
    badge.destroy();
  }
};

export default Dashboard;
