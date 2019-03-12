import React, { Component } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import JSONPretty from 'react-json-pretty';
import { ToastsStore, ToastsContainer } from 'react-toasts';
import ReactTooltip from 'react-tooltip';
import Ink from 'react-ink';
import classnames from 'classnames';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import TopicsService from '../../../services/TopicsService';
import ConsumersService from '../../../services/ConsumersService';

import Loader from '../../../components/loader/Loader';
import Menu from '../../../components/menu/Menu';
import Option from '../../../components/menu/option/Option';

import Error from '../../../components/error/Error';
import SettingsModal from './settingsModal/SettingsModal';
import MetricsService from '../../../services/MetricsService';
import EditPartitionsModal from './editPartitionsModal/EditPartitionsModal';
import { CopyIcon, KeyIcon } from '../../../services/SvgService';
import Tooltip from '../../../components/tooltip/Tooltip';
import ConstantsService from '../../../services/ConstantsService';
import ClustersService from '../../../services/ClustersService';
import Filter from '../../../components/filter/Filter';

let copyJSON;
let renderFormatDateMessage;

const partitionColors = [
  '#e57373',
  '#f06292',
  '#ba68c8',
  '#9575cd',
  '#64b5f6',
  '#4dd0e1',
  '#81c784',
  '#dce775',
  '#ffd54f',
  '#ffb74d',
];

const messageTypes = [
  '10 last messages',
  '30 last messages',
  '100 last messages',
  'Last 5 minutes',
  'Last hour',
  'Today',
  'Live message'
];

class Topic extends Component {
  static propTypes = {
    match: PropTypes.shape({
      params: PropTypes.shape({
        topicId: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    history: PropTypes.shape([]).isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      topicId: this.props.match.params.topicId,
      metrics: [],
      partitions: [],
      consumers: [],
      messages: [],
      liveMessages: false,
      liveMessagesPaused: false,
      maxShownMessages: 20,
      showMessagesHeaders: false,
      loadingMessages: true,
      loadingConsumers: true,
      loadingMetrics: true,
      loadingPartitions: true,
      errorLoadingMetrics: false,
      errorLoadingConsumers: false,
      errorLoadingPartitions: false,
      errorLoadingMessages: false,
      messageTypeSelected: '10 last messages',
      filter: '',
      filterByKey: false,
      filterByRegexp: false
    };
  }

  componentWillMount() {
    this._loadTopicMessages(10);
    this._loadTopicPartitions();
    this._loadTopicConsumers();
    this._loadTopicMetrics();
  }

  _updateFilter(e) {
    this.setState({
      filter: e.filter.replace(/:[ ]*/gm, ':[ ]*'), // Did it to match space (or not) after colon
      filterByRegexp: e.filterByRegexp
    });
  }

  _changeMessageType(type) {
    this.setState({ messageTypeSelected: type });
    let liveMode = false;
    let topicToLoad;
    let timestamp;
    let maxShownMessages;
    switch (type) {
      case '10 last messages':
        topicToLoad = 10;
        maxShownMessages = 10;
        break;
      case '30 last messages':
        topicToLoad = 30;
        maxShownMessages = 10;
        break;
      case '100 last messages':
        topicToLoad = 100;
        maxShownMessages = 10;
        break;
      case 'Last 5 minutes':
	timestamp = Date.now() - 5*60*1000; // 5min
        maxShownMessages = 30;
        break;
      case 'Last hour':
	timestamp = Date.now() - 60*60*1000; // 1h
        maxShownMessages = 30;
        break;
      case 'Today':
	timestamp = Date.now();
	timestamp -= timestamp % (24*60*60*1000); // Set to midnight
        maxShownMessages = 30;
        break;
      case 'Live message':
        liveMode = true;
        maxShownMessages = 30;
        break;
      default:
        break;
    }
    this.setState({ maxShownMessages });
    if (liveMode) {
      this._startLiveMessages(this.state.topicId);
    } else {
      this._loadTopicMessages(topicToLoad, timestamp);
    }
  }

  _startLiveMessages(topicId, clear = true) {
    this.setState({
      loadingMessage: true,
      liveMessages: true,
      liveMessagesPaused: false,
      messages: clear ? [] : this.state.messages
    });
    this.socketSubscription = new WebSocket(ConstantsService.apis.franzManagerApi.webSocketUrl);

    this.socketSubscription.onopen = () => {
      this.socketSubscription.send('subscribe:' + topicId + ':' + ClustersService.getSelectedClusterId());
    };

    this.socketSubscription.onmessage = e => {
      let currentMessages = this.state.messages;
      currentMessages = JSON.parse(e.data)
        .concat(currentMessages);
      this.setState({
        loadingMessage: false,
        messages: currentMessages
      });
    };

    this.socketSubscription.onclose = this.socketSubscription.onerror = () => {
      this.socketSubscription.close();
      this.socketSubscription = null;
      this.setState({
        loadingMessage: false,
        liveMessages: false
      });
    };
  }

  _stopLiveMessage() {
    this.setState({
      liveMessages: true,
      liveMessagesPaused: true
    });
    this.socketSubscription.close();
  }

  _onMessagesScroll(e) {
    if (!this.throttleScroll && this.state.maxShownMessages < this.state.messages.length && e.scrollTop !== 0) {
      const { maxShownMessages } = this.state;
      this.setState({ maxShownMessages: maxShownMessages + 20 });
      setTimeout(() => {
        this.throttleScroll = false;
      }, 100);
    }
  }

  _loadTopicMetrics() {
    const wantedMetrics = [
      {
        id: 'MessagesInPerSec',
        label: 'Messages in'
      },
      {
        id: 'BytesInPerSec',
        label: 'Bytes in'
      },
      {
        id: 'BytesOutPerSec',
        label: 'Bytes out'
      },
    ];
    Promise.all(wantedMetrics.map(metric => MetricsService.getMetrics('kafka.server', 'BrokerTopicMetrics', metric.id, `topic=${this.state.topicId}`)))
      .then((brokersMetrics) => {
        this.setState({
          metrics: brokersMetrics.map(brokersMetric => brokersMetric.reduce((prev, next) => {
            const result = prev;
            result.label = wantedMetrics.find(w => w.id === next.name).label;
            if (!prev.metrics) {
              result.metrics = next.metrics;
            } else {
              ['Count', 'FifteenMinuteRate', 'FiveMinuteRate', 'MeanRate', 'OneMinuteRate'].forEach((metricName) => {
                result.metrics[metricName] += next.metrics[metricName];
              });
            }
            return result;
          }, {})),
          loadingMetrics: false,
        });
      })
      .catch(() => {
        this.setState({
          loadingMetrics: false,
          errorLoadingMetrics: true
        });
      });
  }

  _loadTopicPartitions() {
    TopicsService.getTopicPartitions(this.state.topicId)
      .then((partitions) => {
        this.setState({
          partitions,
          loadingPartitions: false
        });
      })
      .catch(err => {
        this.setState({
          loadingPartitions: false,
          errorLoadingPartitions: true
        });
      });
  }

  _loadTopicConsumers() {
    ConsumersService.getConsumers(null, this.state.topicId)
      .then((consumers) => {
        this.setState({
          loadingConsumers: false,
          consumers: consumers.map(c => c.group)
            .filter((v, i, a) => a.indexOf(v) === i),
        });
      })
      .catch(() => {
        this.setState({
          loadingConsumers: false,
          errorLoadingConsumers: true
        });
      });
  }

  _loadTopicMessages(number, timestamp) {
    this.setState({
      loadingMessages: true,
      messages: [],
    });
    TopicsService.getLastTopicMessages(this.state.topicId, number, timestamp)
      .then((messages) => {
        this.setState({
          loadingMessages: false,
          messages,
        });
      })
      .catch((e) => {
        console.log(e);
        if (e.message.includes('No message for this topic.')) {
          this.setState({
            loadingMessages: false,
            messages: [],
          });
        } else {
          this.setState({
            loadingMessages: false,
            messages: [],
            errorLoadingMessages: true,
          });
        }
      });
  }

  _openSettings() {
    this.setState({ settingsModal: true });
  }

  _closeSettings() {
    this.setState({ settingsModal: false });
  }

  _openEditPartitionModal() {
    this.setState({ editPartitionModal: true });
  }

  _closeEditPartitionModal() {
    this.setState({ editPartitionModal: false });
  }

  _deleteTopic() {
    TopicsService.deleteTopic(this.state.topicId)
      .then(() => {
        this.props.history.goBack();
      });
  }

  _selectPartition(partition) {
    if (this.state.selectedPartition && this.state.selectedPartition.partition === partition.partition) {
      return this.setState({ selectedPartition: null });
    }
    this.setState({ selectedPartition: partition });
    return null;
  }

  _toggleSwitch(event) {
    const state = this.state;
    state[event] = !state[event];
    this.setState(state);
  }

  _renderContextActions() {
    return (
      <div className="context-actions topic-context-actions">
        <button type="button" onClick={this._openSettings.bind(this)} className="toggle">
          Settings
          <Ink/>
        </button>
        <button type="button" onClick={this._openEditPartitionModal.bind(this)} className="toggle">
          Add Partitions
          <Ink/>
        </button>
        {this.state.confirmDelete ? [
            <button type="button" onClick={this._deleteTopic.bind(this)} className="toggle danger">
              Confirm
              <Ink/>
            </button>,
            <button type="button" onClick={() => this.setState({ confirmDelete: false })} className="regular">
              Cancel
              <Ink/>
            </button>,
          ]
          : (
            <button type="button" onClick={() => this.setState({ confirmDelete: true })} className="toggle">
              Delete Topic
              <Ink/>
            </button>
          )
        }
        <button type="button"
                className={classnames({ active: this.state.showMessagesHeaders }, 'show-headers', 'toggle')}
                onClick={this._toggleSwitch.bind(this, 'showMessagesHeaders')}>Messages headers
        </button>
      </div>
    );
  }

  _renderMetrics() {
    return (
      <div className="metrics">
        <header>
          <h3>Metrics</h3>
        </header>
        {this.state.loadingMetrics && <Loader width="32"/>}
        {this.state.errorLoadingMetrics && !this.state.loadingMetrics && <Error noRiddle/>}
        {!this.state.loadingMetrics && !this.state.errorLoadingMetrics && (
          <table>
            <thead>
            <tr>
              <th className="text-left">Name (per sec)</th>
              <th className="text-right">Last minute</th>
              <th className="text-right">last 5 minutes</th>
              <th className="text-right">last 15 minutes</th>
            </tr>
            </thead>
            <tbody>
            {this.state.metrics.map(metric => (
              <tr key={`metris-${metric.label}`}>
                <td className="text-left">{metric.label}</td>
                <td
                  className="text-right">{metric.metrics.OneMinuteRate ? metric.metrics.OneMinuteRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : ''}</td>
                <td
                  className="text-right">{metric.metrics.FiveMinuteRate ? metric.metrics.FiveMinuteRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : ''}</td>
                <td
                  className="text-right">{metric.metrics.FifteenMinuteRate ? metric.metrics.FifteenMinuteRate.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : ''}</td>
              </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  _renderPartitions() {
    const messagesPerPartition = {};
    const { messages } = this.state;
    this.state.partitions.forEach((p) => {
      messagesPerPartition[p.partition] = messages.filter(m => m.partition === p.partition).length;
    });
    return (
      <div className="partitions flex flex-1 flex-column">
        <header>
          <h3>Partitions</h3>
        </header>
        {this.state.loadingPartitions && <Loader width="32"/>}
        {this.state.errorLoadingPartitions && !this.state.loadingPartitions && <Error noRiddle/>}
        {!this.state.loadingPartitions && !this.state.errorLoadingPartitions && (
          <PerfectScrollbar className="partition-datatable">
            <table>
              <thead>
              <tr>
                <th className="text-left">
                  partitions
                  <span className="">(Displayed messages)</span>
                </th>
                <th className="text-right">beginning offset</th>
                <th className="text-right">end offset</th>
                <th className="text-right">replicas</th>
                <th className="text-right">in sync</th>
                <th className="text-right">leader</th>
              </tr>
              </thead>
              <tbody>
              {this.state.partitions.sort((a, b) => a.partition - b.partition)
                .map((partition) => {
                  const synchronizing = partition.replicas.length !== partition.inSyncReplicas.length;
                  const partitionColor = partitionColors[partition.partition % partitionColors.length];
                  return (
                    <tr
                      key={`partition-${partition.partition}`}
                      className={classnames({
                        selected: this.state.selectedPartition && this.state.selectedPartition.partition === partition.partition,
                        synchronizing,
                      }, 'pointer')}
                      onClick={this._selectPartition.bind(this, partition)}
                    >
                      <td className="text-left">
                        <div className="flex align-center">
                          <i
                            className="ellipse margin-right-8px ellipse-8px"
                            style={{ backgroundColor: partitionColor }}
                          />
                          {partition.partition}
                          {' '}
                          <span
                            className="margin-left-12px displayed-messages"
                          >
                            {messagesPerPartition[partition.partition]}
                        </span>
                        </div>
                      </td>
                      <td
                        className="text-right">{(partition.beginningOffset || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                      <td
                        className="text-right">{(partition.endOffset || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                      <td className="text-right">
                        {partition.replicas.join(', ')}
                      </td>
                      <td className="text-right">
                        {partition.inSyncReplicas.join(', ')}
                      </td>
                      <td className="text-right">{partition.leader}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PerfectScrollbar>
        )}
      </div>
    );
  }

  _renderConsumers() {
    return (
      <div className="consumers">

        <header>
          <h3>Consumers</h3>
        </header>
        {this.state.loadingConsumers && <Loader width="32"/>}
        {this.state.errorLoadingConsumers && !this.state.loadingConsumers && <Error noRiddle/>}
        {!this.state.loadingConsumers && !this.state.errorLoadingConsumers
        && this.state.consumers.length === 0 ?
          <div className="no-consumers padding-left-8px">There are no consumers.</div>
          : (
            <div className="consumer-list">
              {this.state.consumers.map(consumer => (
                <Link
                  key={`consumer-${consumer}`}
                  to={`/consumers/${consumer}`}
                >
                  <button type="button" key={consumer}>
                    {consumer}
                    {' '}
                    <Ink/>
                  </button>
                </Link>
              ))}
            </div>
          )
        }
      </div>
    );
  }

  _renderMessages() {
    let messages = this.state.messages;
    if (this.state.selectedPartition) {
      messages = messages.filter(m => m.partition === this.state.selectedPartition.partition);
    }
    if (this.state.filter) {
      if (this.state.filterByRegexp) {
        try {
          const regexp = new RegExp(this.state.filter);
          messages = messages.filter(m => this.state.filterByKey ? (m.key || '').match(regexp) : m.value.match(regexp));
        } catch (e) {
          messages = [];
        }
      } else {
        messages = messages.filter(m => this.state.filterByKey ? (m.key || '').includes(this.state.filter) : m.value.includes(this.state.filter));
      }
    }
    const totalMessages = messages.length;
    messages = messages.slice(0, this.state.maxShownMessages);
    return (
      <div className="flex flex-1">
        <section className="filter-section flex-1">
          <header className="filter flex" key="header">
            <h3>
              {totalMessages}
              {' '}
              messages
            </h3>
            <Filter
              onChange={this._updateFilter.bind(this)}
              value={this.state.filter}
              filterByRegexp={this.state.filterByRegexp}
              className="filter margin-left-8px"
            />
            <Tooltip content="Filter by key">
              <button type="button"
                      className={classnames({ active: this.state.filterByKey }, 'filter-by-key', 'toggle')}
                      onClick={this._toggleSwitch.bind(this, 'filterByKey')}><KeyIcon width={24}
                                                                                      height={24}/>
              </button>
            </Tooltip>
          </header>
        </section>
        <PerfectScrollbar className="messages-list" onYReachEnd={this._onMessagesScroll.bind(this)}>
          {this.state.loadingMessages && <Loader width="32"/>}
          {!this.state.loadingMessages && this.state.errorLoadingMessages && <Error noRiddle/>}
          {!this.state.loadingMessages && !this.state.errorLoadingMessages
          && messages.length === 0 ? <div className="no-messages">There are no messages.</div>
            : messages.map((message) => {
              const partitionColor = partitionColors[message.partition % partitionColors.length];
              return (
                <section key={message.key + message.offset}>
                  <div className="timestamp-wrapper">
                    {renderFormatDateMessage(message.timestamp)}
                  </div>
                  <header className="flex">
                    <div className="flex-1 key">
                      <span className="key-message">
                        {' '}
                        {message.key ? message.key : 'No key'}
                      </span>
                    </div>
                    <div className="partition" style={{ backgroundColor: partitionColor }}>
                      Partition
                      {' '}
                      {message.partition}
                    </div>
                    <Tooltip content="Copy message">
                      <div className="copy-icon" onClick={copyJSON.bind(this, message.value)}>
                        <CopyIcon/>
                        <Ink/>
                      </div>
                    </Tooltip>
                  </header>
                  {(() => {
                    if (this.state.showMessagesHeaders) {
                      if(Object.keys(message.headers).length > 0) {
                        const headers = message.headers;
                        for(const key in Object.keys(headers)) {
                          const values = headers[key];
                          if(values && values.length == 1) headers[key] = values[0];
                        }
                        try {
                          return <JSONPretty json={headers}/>;
                        } catch(e) {
                          return <div className="simple-message">{headers}</div>; // Shoudln't happen?
                        }
                      } else {
                        return <div className="no-headers">no headers.</div>;
                      }
                    } else {
                      try {
                        return <JSONPretty json={message.value}/>;
                      } catch (e) {
                        return <div className="simple-message">{message.value}</div>;
                      }
                    }
                  })()}
                </section>
              );
            })
          }
        </PerfectScrollbar>

        <div className="message-fetch-type-wrapper">
          {this.state.messageTypeSelected === 'Live message' ?
            this.state.liveMessagesPaused ? (
              <button type="button" className="message-live-toggle"
                      onClick={this._startLiveMessages.bind(this, this.state.topicId, false)}>
                <i className="mdi mdi-play mdi-24px"/>
                <Ink/>
              </button>) : (
              <button type="button" className="message-live-toggle" onClick={this._stopLiveMessage.bind(this)}>
                <i className="mdi mdi-pause mdi-24px"/>
                <Ink/>
              </button>
            ) : (
              <button
                type="button"
                className="message-live-toggle"
                onClick={this._loadTopicMessages.bind(this, this.state.messages.length)}
              >
                <i className="mdi mdi-refresh mdi-24px"/>
                <Ink/>
              </button>
            )}
          <Menu label={this.state.messageTypeSelected}>
            {messageTypes.map(type => (
              <Option
                onChange={this._changeMessageType.bind(this)}
                value={type}
                ref={type}
                key={`option-${type}`}
                selected={this.state.messageTypeSelected}
              >
                {type}
              </Option>
            ))}
          </Menu>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="topic-item-view grid-wrapper">
        {this._renderContextActions()}
        <div className="grid">
          <div className="column left-column">
            <section>{this._renderMetrics()}</section>
            <section>{this._renderConsumers()}</section>
            <section className="flex-1">{this._renderPartitions()}</section>
          </div>
          <div className="column darker">
            {this._renderMessages()}
          </div>
        </div>
        {this.state.settingsModal
        && <SettingsModal topic={this.state.topicId} close={this._closeSettings.bind(this)}/>}
        {this.state.editPartitionModal
        && (
          <EditPartitionsModal
            refreshPartitions={this._loadTopicPartitions.bind(this)}
            topic={this.state.topicId}
            currentPartitions={this.state.partitions.length}
            close={this._closeEditPartitionModal.bind(this)}
          />
        )}
        <ToastsContainer store={ToastsStore}/>
        <ReactTooltip/>
      </div>
    );
  }
}

copyJSON = (json) => {
  const textarea = document.createElement('textarea');
  textarea.value = json;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  ToastsStore.success('Message content copied.');
};

renderFormatDateMessage = (timestamp) => {
  const date = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);

  const ms = new Date(timestamp).getMilliseconds();

  return (
    <span className="timestamp">
      {date}
      {' '}
      and
      {' '}
      <span className="milliseconds">
        {' '}
        {ms}
        ms
      </span>
      {' '}
    </span>
  );
};

export default Topic;
