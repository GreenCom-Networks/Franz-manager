import React from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import Ink from 'react-ink';
import BrokersService from '../../services/BrokersService';
import Loader from '../../components/loader/Loader';
import Error from '../../components/error/Error';
import Filter from '../../components/filter/Filter';
import MetricsService from '../../services/MetricsService';
import { CrownIcon } from '../../services/SvgService';

let copyToClipboard;
let getValueType;
let isNormalInteger;

class Clusters extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      brokers: [],
      metrics: [],
      brokersSettings: {
        ssl: {},
        transaction: {},
        offset: {},
        replica: {},
        zookeeper: {},
        sasl: {},
        log: {},
        others: {},
      },
      loadingBrokers: true,
      loadingBrokersSettings: true,
      loadingMetrics: true,
      zookeeperString: '',
      kafkaString: '',
      errorLoadingMetrics: false,
      errorLoadingBrokers: false,
      errorLoadingBrokersSettings: false,
      settingsFilter: '',
      settingsFilterByRegexp: '',
    };
  }

  componentWillMount() {
    this._loadTopicsMetrics();
    this._loadBrokers();
  }

  _loadBrokers() {
    this.setState({ loadingBrokers: true });
    BrokersService.getBrokers(null, true)
      .then((brokers) => {
        this.setState({
          brokers,
          loadingBrokers: false,
        });
        this._formatBrokersSettings(brokers);
        const tasks = [MetricsService.getMetrics('kafka.server', 'BrokerTopicMetrics', 'BytesInPerSec'),
          MetricsService.getMetrics('kafka.server', 'BrokerTopicMetrics', 'BytesOutPerSec'),
          MetricsService.getMetrics('kafka.controller', 'KafkaController', 'ActiveControllerCount')];

        return Promise.all(tasks);
      })
      .then((metrics) => {
        const { brokers } = this.state;
        metrics.forEach((brokersMetric) => {
          brokersMetric.forEach((brokerMetric) => {
            const broker = brokers.find(b => b.id === brokerMetric.brokerId.toString());
            if (brokerMetric.name === 'ActiveControllerCount') {
              broker.leader = brokerMetric.metrics.Value === 1;
            } else {
              broker[brokerMetric.name] = brokerMetric.metrics.FiveMinuteRate;
            }
          });
        });
        this.setState({ brokers });
      })
      .catch(() => {
        this.setState({
          loadingBrokers: false,
          errorLoadingBrokers: true,
        });
      });
  }

  _loadTopicsMetrics() {
    this.setState({ loadingMetrics: true });

    const wantedMetrics = [
      {
        id: 'MessagesInPerSec',
        label: 'Messages in',
      },
      {
        id: 'BytesInPerSec',
        label: 'Bytes in per sec',
      },
      {
        id: 'BytesOutPerSec',
        label: 'Bytes out per sec',
      },
      {
        id: 'BytesRejectedPerSec',
        label: 'Bytes rejected',
      },
      {
        id: 'FailedFetchRequestsPerSec',
        label: 'Failed fetch request',
      },
      {
        id: 'FailedProduceRequestsPerSec',
        label: 'Failed produce request',
      },
      {
        id: 'FetchMessageConversionsPerSec',
        label: 'Fetch message conversion',
      },
      {
        id: 'ProduceMessageConversionsPerSec',
        label: 'Produce message conversion',
      },
      {
        id: 'ReplicationBytesInPerSec',
        label: 'Replication bytes in',
      },
      {
        id: 'ReplicationBytesOutPerSec',
        label: 'Replication bytes out',
      },
      {
        id: 'TotalFetchRequestsPerSec',
        label: 'Total fetch requests',
      },
      {
        id: 'TotalProduceRequestsPerSec',
        label: 'Total produce requests',
      },
    ];
    Promise.all(wantedMetrics.map(metric => MetricsService.getMetrics('kafka.server', 'BrokerTopicMetrics', metric.id, null)))
      .then((brokersMetrics) => {
        this.setState({
          metrics: brokersMetrics.map(brokersMetric => brokersMetric.reduce((prev, next) => {
            const res = prev;
            res.label = wantedMetrics.find(w => w.id === next.name).label;
            if (!res.metrics) {
              res.metrics = next.metrics;
            } else {
              ['Count', 'FifteenMinuteRate', 'FiveMinuteRate', 'MeanRate', 'OneMinuteRate'].forEach((metricName) => {
                res.metrics[metricName] += next.metrics[metricName];
              });
            }
            return res;
          }, {})),
          loadingMetrics: false,
        });
      })
      .catch(() => {
        this.setState({
          loadingMetrics: false,
          errorLoadingMetrics: true,
        });
      });
  }

  _formatBrokersSettings(brokers) {
    this.setState({ loadingBrokersSettings: true });
    const { brokersSettings } = this.state;
    const configuration = brokers[0].configurations;
    this.setState({
      zookeeperString: configuration['zookeeper.connect'],
      kafkaString: brokers.map(b => `${b.host}:${b.port}`)
        .join(','),
    });
    for (const configKey in configuration) {
      let found = false;
      for (const settingKey in brokersSettings) {
        if (configKey.includes(settingKey)) {
          brokersSettings[settingKey][configKey] = configuration[configKey];
          found = true;
          break;
        }
      }
      if (!found) {
        brokersSettings.others[configKey] = configuration[configKey];
      }
    }
    this.setState({ loadingBrokersSettings: false });
  }

  _updateFilterComponent(e) {
    this.setState({
      settingsFilterByRegexp: e.filterByRegexp,
      settingsFilter: e.filter,
    });
  }

  _renderContextActions() {
    return (
      <div className="clusters-context-actions context-actions flex">
        <div className="kafka address flex align-center">
          <span className="key">
                    kafka
          </span>
          <span className="value">
            {this.state.kafkaString}
          </span>
          <span className="tooltip">
            {this.state.kafkaString}
          </span>
          <button
            type="button"
            onClick={copyToClipboard.bind(null, this.state.kafkaString)}
          >
            <i className="mdi mdi-content-copy"/>
            <Ink/>
          </button>
        </div>
        <div className="zookeeper address flex align-center">
          <span className="key">
                    zookeeper
          </span>
          <span className="value">
            {this.state.zookeeperString}
          </span>
          <span className="tooltip">
            {this.state.zookeeperString}
          </span>
          <button
            type="button"
            onClick={copyToClipboard.bind(null, this.state.zookeeperString)}
          >
            <i className="mdi mdi-content-copy"/>
            <Ink/>
          </button>
        </div>
      </div>
    );
  }

  _renderBrokers() {
    return (
      <section>
        {this.state.loadingBrokers && <Loader width="32"/>}
        {this.state.errorLoadingBrokers && !this.state.loadingBrokers && <Error noRiddle/>}
        {!this.state.loadingBrokers && !this.state.errorLoadingBrokers
        && [
          <header key="headerBroker"><h3>Brokers</h3></header>,
          <table key="tableBroker">
            <thead>
            <tr>
              <th className="text-left">Broker Id</th>
              <th className="text-right">Host</th>
              <th className="text-right">Port</th>
              <th className="text-right">Bytes In per sec</th>
              <th className="text-right">bytes Out per sec</th>
            </tr>
            </thead>
            <tbody>
            {this.state.brokers.map(broker => (
              <tr key={broker.id} className={broker.state !== 'OK' ? 'dead-broker' : ''}>
                <td className="text-left">{broker.id}  {broker.leader && <CrownIcon width={16} height={16} className="leader-icon"/>}</td>
                <td className="text-right">{broker.host}</td>
                <td className="text-right">{broker.port}</td>
                <td
                  className="text-right"
                >
                  {typeof broker.BytesInPerSec !== 'undefined' ? broker.BytesInPerSec.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
                </td>
                <td
                  className="text-right"
                >
                  {typeof broker.BytesOutPerSec !== 'undefined' ? broker.BytesOutPerSec.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
                </td>
              </tr>
            ))}
            </tbody>
          </table>,
        ]
        }
      </section>
    );
  }

  _renderSettings() {
    return (
      <section className="flex-1">
        {this.state.loadingBrokersSettings && <Loader width="32"/>}
        {!this.state.loadingBrokersSettings && !this.state.errorLoadingBrokersSettings
        && [
          <header className="filter flex" key="header-settings">
            <h3>Settings</h3>
            <Filter onChange={this._updateFilterComponent.bind(this)} className="margin-left-32px"/>
          </header>,
          <PerfectScrollbar className="scrollbar settings-list">
            {
              Object.keys(this.state.brokersSettings)
                .filter(settingsKey => Object.keys(this.state.brokersSettings[settingsKey])
                  .find((settingKey) => {
                    if (this.state.settingsFilterByRegexp) {
                      return new RegExp(this.state.settingsFilter).test(settingKey);
                    }
                    return settingKey.includes(this.state.settingsFilter);
                  }))
                .map((settingsKey) => {
                  const settingsValue = this.state.brokersSettings[settingsKey];
                  return (
                    <div className="margin-top-32px" key={settingsKey}>
                      <header><h4>{settingsKey}</h4></header>
                      {
                        Object.keys(settingsValue)
                          .filter((settingKey) => {
                            if (this.state.settingsFilterByRegexp) {
                              return new RegExp(this.state.settingsFilter).test(settingKey);
                            }
                            return settingKey.includes(this.state.settingsFilter);
                          })
                          .map((settingKey) => {
                            const settingValue = settingsValue[settingKey];
                            return (
                              <div
                                key={settingKey}
                                className="flex space-between settings-item align-center"
                              >
                                <span className="settings-line-key">{settingKey}</span>
                                <span
                                  className={`settings-line-${getValueType(settingValue)}`}
                                >
                                  {settingValue || 'null'}
                                </span>
                              </div>
                            );
                          })
                      }
                    </div>
                  );
                })
            }
          </PerfectScrollbar>,
        ]
        }
      </section>
    );
  }

  _renderMetrics() {
    return (
      <section className="flex-1">
        {this.state.loadingMetrics && <Loader width="32"/>}
        {this.state.errorLoadingMetrics && !this.state.loadingMetrics && <Error noRiddle/>}

        {!this.state.loadingMetrics && !this.state.errorLoadingMetrics
        && [
          <header key="headerMetrics"><h3>Metrics</h3></header>,

          <PerfectScrollbar className="scrollbar" key="scrollbar-metrics">
            <table key="tableMetrics">
              <thead>
              <tr>
                <th className="text-left">Name (per sec)</th>
                <th className="text-right">Mean Rate</th>
                <th className="text-right">Last minute</th>
                <th className="text-right">last 5 minutes</th>
                <th className="text-right">last 15 minutes</th>
              </tr>
              </thead>
              <tbody>
              {this.state.metrics.map((metric) => {
                if (!metric.metrics) {
                  return (
                    <tr>
                      <td/>
                      <td/>
                      <td/>
                      <td/>
                      <td/>
                    </tr>
                  );
                }
                return (
                  <tr key={metric.name}>
                    <td className="text-left">{metric.label}</td>
                    <td
                      className="text-right"
                    >
                      {metric.metrics.MeanRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className="text-right"
                    >
                      {metric.metrics.OneMinuteRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className="text-right"
                    >
                      {metric.metrics.FiveMinuteRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className="text-right"
                    >
                      {metric.metrics.FifteenMinuteRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </PerfectScrollbar>,
        ]
        }
      </section>
    );
  }

  render() {
    return (
      <div className="clusters-view grid-wrapper">
        {this._renderContextActions()}
        <div className="grid">
          <div className="column">
            {this._renderBrokers()}
            {this._renderMetrics()}
          </div>
          <div className="column">
            {this._renderSettings()}
          </div>
        </div>
      </div>
    );
  }
}

getValueType = (value) => {
  if (value === null) return 'null';
  if (value.toString() === 'false' || value.toString() === 'true') return 'boolean';
  if (isNormalInteger(value)) return 'value';
  return 'string';
};

isNormalInteger = (str) => {
  const n = Math.floor(Number(str));
  return n !== Infinity && String(n) === str && n >= 0;
};

copyToClipboard = (str) => {
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

export default Clusters;
