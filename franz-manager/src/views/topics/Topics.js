import React from 'react';
import { withRouter } from 'react-router-dom';
import classnames from 'classnames';
import PerfectScrollbar from 'react-perfect-scrollbar';
import Ink from 'react-ink';
import FolderIcon from 'mdi-react/FolderIcon';
import { ToastsStore, ToastsContainer } from 'react-toasts';
import PropTypes from 'prop-types';

import querystring from 'querystring';
import Link from 'react-router-dom/es/Link';
import Loader from '../../components/loader/Loader';
import Switch from '../../components/switch/Switch';
import Error from '../../components/error/Error';
import { SubTreeIcon } from '../../services/SvgService';
import TopicsService from '../../services/TopicsService';
import Filter from '../../components/filter/Filter';
import Modal from '../../components/modal/Modal';
import AddTopicModal from './addTopicModal/AddTopicModal';
import Loadbar from '../../components/loadbar/Loadbar';
import Tooltip from '../../components/tooltip/Tooltip';

let mergeTopicsAndMetrics;
let getSubstringIndex;
let isPartitionsSynchronizing;
let decodeQueryParams;

class Topics extends React.Component {
  static propTypes = {
    location: PropTypes.shape({
      search: PropTypes.string.isRequired,
    }).isRequired,
    history: PropTypes.shape([]).isRequired,
  };

  constructor(props) {
    super(props);

    this.inputTopicsNumber = React.createRef();

    const queryParams = decodeQueryParams(this.props.location.search.substring(1));

    this.state = {
      topics: [],
      maxShownTopics: 200,
      loadingTopics: false,
      errorLoadingTopics: false,
      topicsFilters: queryParams,
      reverseSort: false,
      bulkDeleteModal: false,
    };
  }

  componentWillMount() {
    this._loadTopics();
  }

  componentWillReceiveProps(props) {
    if (props.location.search !== this.props.location.search) {
      const queryParams = decodeQueryParams(props.location.search.substring(1));
      this.setState({ topicsFilters: queryParams });
    }
  }

  _loadTopics() {
    const topicsMetrics = TopicsService.getStoredData('topics-metrics') || {};
    let topics = TopicsService.getStoredData('topics') || [];
    this.setState({
      loadingTopics: true,
      topics: mergeTopicsAndMetrics(topics, topicsMetrics),
    });
    TopicsService.getTopics(false)
      .then((t) => {
        topics = t.map(topic => {
          topic.totalMessages = topic.partitions.reduce((prev, next) => prev + next.endOffset, 0);
          topic.retainedMessages = topic.partitions.reduce((prev, next) => prev + next.endOffset - next.beginningOffset, 0);
          return topic;
        });
        return TopicsService.getGlobalTopicsMetrics();
      })
      .then((tm) => {
        this.setState({
          topics: mergeTopicsAndMetrics(topics, tm),
          loadingTopics: false
        });
      })
      .catch(() => {
        this.setState({
          loadingTopics: false,
          errorLoadingTopics: true
        });
      });
  }

  _filterTopics(topics) {
    const filters = this.state.topicsFilters;
    let regexp;

    if (filters.filterByRegexp) {
      try {
        regexp = new RegExp(filters.topicName || '.*');
        if (!this.state.isRegexpWellFormatted) {
          this.setState({ isRegexpWellFormatted: true });
        }
      } catch (e) {
        if (this.state.isRegexpWellFormatted) {
          this.setState({ isRegexpWellFormatted: false });
        }
        return [];
      }
    }

    const filteredTopics = topics.filter((topic) => {
      let topicNameFilter = true;

      if (filters.filterByRegexp) {
        topicNameFilter = regexp.test(topic.id);
      } else if (filters.caseSensitive) {
        topicNameFilter = topic.id.indexOf(filters.topicName) >= 0;
      } else {
        topicNameFilter = topic.id.toLowerCase()
          .indexOf(filters.topicName.toLowerCase()) >= 0;
      }

      const showLogs = filters.hideLogsTopics ? topic.id.substr(topic.id.length - 4, 4) !== '.log' : true;
      return topicNameFilter && showLogs;
    });

    return this.state.reverseSort ? filteredTopics.reverse() : filteredTopics;
  }

  _onTopicScroll(e) {
    if (!this.throttleScroll && this.state.maxShownTopics < this.state.topics.length && e.scrollTop !== 0) {
      const { maxShownTopics } = this.state;
      this.setState({ maxShownTopics: maxShownTopics + 20 });
      setTimeout(() => {
        this.throttleScroll = false;
      }, 100);
    }
  }

  _updateFilterComponent(e) {
    const { topicsFilters } = this.state;
    const currentTopicsFilters = { ...topicsFilters };
    currentTopicsFilters.filterByRegexp = e.filterByRegexp;
    currentTopicsFilters.topicName = e.filter;
    this.props.history.push(`?${querystring.encode(currentTopicsFilters)}`);
    this.setState({ topicsFilters: currentTopicsFilters });
  }

  _toggleSwitch(label) {
    const { topicsFilters } = this.state;
    topicsFilters[label] = !topicsFilters[label];
    this.props.history.push(`?${querystring.encode(topicsFilters)}`);
    this.setState({ topicsFilters });
  }

  _sortBy(by) {
    const { topicsFilters } = this.state;
    const currentTopicsFilters = { ...topicsFilters };

    if (currentTopicsFilters.sortBy === by) {
      currentTopicsFilters.reverseSort = !currentTopicsFilters.reverseSort;
    } else {
      currentTopicsFilters.reverseSort = false;
      currentTopicsFilters.sortBy = by;
    }

    this.props.history.push(`?${querystring.encode(currentTopicsFilters)}`);
    this.setState({ topicsFilters: currentTopicsFilters });
  }

  _doSortBy(array, sortBy) {
    return [...array].sort((e1, e2) => {
      let v1 = e1[sortBy];
      let v2 = e2[sortBy];
      if(v1 < v2) return -1;
      if(v1 > v2) return 1;
      return 0;
    });
  }

  _navigateToFolder(folder) {
    const { topicsFilters } = this.state;
    topicsFilters.folder = folder.id || folder;
    this.props.history.push(`?${querystring.encode(topicsFilters)}`);
    this.setState({ topicsFilters });
  }

  _renderTopics(topics) {
    let sorted = this._doSortBy(topics, this.state.topicsFilters.sortBy);
    if ((this.state.topicsFilters.sortBy !== 'id' && !this.state.topicsFilters.reverseSort)
      || (this.state.topicsFilters.reverseSort && this.state.topicsFilters.sortBy === 'id')) {
	sorted = sorted.reverse();
    }
    return (
      <tbody>
      {sorted.slice(0, this.state.maxShownTopics)
        .map((topic) => {
          const partitionSynchronizing = isPartitionsSynchronizing(topic.partitions);
          return (
            <tr key={topic.id} className={classnames({ synchronizing: partitionSynchronizing }, 'pointer')}>
              <td className="text-left"><Link to={`/topics/${topic.id}`}>{topic.id}</Link></td>
              <td className="text-right">
                <Link to={`/topics/${topic.id}`}>
                  {Number.isInteger(topic.totalMessages) ? topic.totalMessages.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
                </Link>
              </td>
              <td className="text-right">
                <Link to={`/topics/${topic.id}`}>
                  {topic.configurations && topic.configurations['cleanup.policy'] === 'compact' ?
                    <Tooltip content="This metric cannot be retrieved for compacted topics"
                             className='compacted-topic'>Compacted</Tooltip> :
                    Number.isInteger(topic.retainedMessages) ? topic.retainedMessages.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
                </Link>
              </td>
              <td className="text-right">
                <Link to={`/topics/${topic.id}`}>
                  {topic.messagesPerSec.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </Link>
              </td>
              <td className="text-right">
                <Link to={`/topics/${topic.id}`}>{topic.partitions.length}</Link>
              </td>
              <td className="text-right">
                <Link to={`/topics/${topic.id}`}>{topic.partitions[0].replicas.length}</Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  }

  _renderTreeView(topics) {
    let folders = [];
    let finalTopics = [];
    const folderFilter = this.state.topicsFilters.folder || '';
    const folderIndex = folderFilter ? folderFilter.split('.').length + 1 : 1;
    topics.filter(topic => topic.id.indexOf(folderFilter) === 0)
      .forEach((topic) => {
        const substringIndex = getSubstringIndex(topic.id, '.', folderIndex);
        const substring = topic.id.substring(0, substringIndex === -1 ? topic.id.length : substringIndex);
        if (substring.length < topic.id.length) {
          const folderIndex2 = folders.findIndex(f => f.id === substring);
          if (folderIndex2 === -1) {
            folders.push({
              id: substring,
              topics: [topic],
              totalMessages: topic.totalMessages,
              retainedMessages: topic.retainedMessages,
              messagesPerSec: topic.messagesPerSec,
              partitions: topic.partitions.length,
              replications: topic.partitions[0].replicas.length,
            });
          } else {
            folders[folderIndex2].topics.push(topic);
            folders[folderIndex2].totalMessages += topic.totalMessages;
            folders[folderIndex2].retainedMessages += topic.retainedMessages;
            folders[folderIndex2].messagesPerSec += topic.messagesPerSec;
            folders[folderIndex2].partitions += topic.partitions.length;
            folders[folderIndex2].replications += topic.partitions[0].replicas.length;
          }
        } else {
          finalTopics.push(topic);
        }
      });

    folders = this._doSortBy(folders, this.state.topicsFilters.sortBy);
    finalTopics = this._doSortBy(finalTopics, this.state.topicsFilters.sortBy);

    if ((this.state.topicsFilters.sortBy !== 'id' && !this.state.topicsFilters.reverseSort)
      || (this.state.topicsFilters.reverseSort && this.state.topicsFilters.sortBy === 'id')) {
      folders = folders.reverse();
      finalTopics = finalTopics.reverse();
    }

    return (
      <tbody>
      {folderIndex > 1
      && (
        <tr
          className="pointer"
          onClick={this._navigateToFolder.bind(this, folderFilter.substring(0, folderFilter.lastIndexOf('.')))}
        >
          <td className="text-left">
            <FolderIcon width={20} className="folder-icon"/>
            <span className="margin-left-8px">..</span>
          </td>
          <td className="text-right"/>
          <td className="text-right"/>
        </tr>
      )}
      {folders.map(folder => (
        <tr className="pointer" onClick={this._navigateToFolder.bind(this, folder)}>
          <td className="text-left flex align-center">
            <FolderIcon size={20} className="folder-icon"/>
            <span className="margin-left-8px">{folder.id}</span>
            <span className="folder-stat">
                {folder.topics.length}
              {' '}
              topic
              {folder.topics.length > 1 && 's'}
              </span>
          </td>
          <td
            className="text-right">{Number.isInteger(folder.totalMessages) ? folder.totalMessages.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}</td>
          <td
            className="text-right">{Number.isInteger(folder.retainedMessages) ? folder.retainedMessages.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}</td>
          <td className="text-right">{folder.messagesPerSec.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
          <td className="text-right">{folder.partitions}</td>
          <td className="text-right">{folder.replications}</td>
        </tr>
      ))}
      {finalTopics.map(topic => (
        <tr className="pointer">
          <td className="text-left flex align-center">
            <SubTreeIcon width={20} className="subtree-icon"/>
            <span className="margin-left-8px">
                <Link to={`/topics/${topic.id}`}>
                  {topic.id}
                </Link>
              </span>
          </td>
          <td className="text-right">
            <Link to={`/topics/${topic.id}`}>
              {Number.isInteger(topic.totalMessages) ? topic.totalMessages.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
            </Link>
          </td>
          <td className="text-right">
            <Link to={`/topics/${topic.id}`}>
              {Number.isInteger(topic.retainedMessages) ? topic.retainedMessages.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '-'}
            </Link>
          </td>
          <td className="text-right">
            <Link to={`/topics/${topic.id}`}>
              {topic.messagesPerSec.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </Link>
          </td>
          <td className="text-right">
            <Link to={`/topics/${topic.id}`}>{topic.partitions.length}</Link>
          </td>
          <td className="text-right">
            <Link to={`/topics/${topic.id}`}>{topic.partitions[0].replicas.length}</Link>
          </td>
        </tr>
      ))}
      </tbody>
    );
  }

  async _deleteTopics(topics) {
    if (!this.inputTopicsNumber || Number(this.inputTopicsNumber.current.value) !== topics.length) {
      console.error('Cannot match input value and topics length');
      return;
    }
    this.setState({ badInput: null });

    const { length } = topics;
    const topicsCopy = JSON.parse(JSON.stringify(topics));
    for (const topic of topics) {
      try {
        await TopicsService.deleteTopic(topic.id);
      } catch (e) {
        ToastsStore.error(`could not delete topic ${topic.id}`);
      }
      topicsCopy.splice(topicsCopy.findIndex(t => t.id === topic.id), 1);
      this.setState({ topicsToDelete: topicsCopy });
    }
    this.setState({
      bulkDeleteModal: false,
      askBulkDeleteConfirmation: false,
      topicsToDelete: [],
    });
    ToastsStore.success(`Successfully deleted ${length} topic${length > 1 ? 's' : ''} !`, 5000);
    this._loadTopics();
  }

  _openBulkDeleteModal(topics) {
    this.setState({
      bulkDeleteModal: true,
      topicsToDelete: topics
    });
  }

  _closeBulkDeleteModal() {
    this.setState({
      bulkDeleteModal: false,
      askBulkDeleteConfirmation: false,
      badInput: null,
      topicsToDelete: null,
    });
  }

  _openAddTopicModal() {
    this.setState({
      addTopicModal: true,
    });
  }

  _closeAddTopicModal() {
    this.setState({
      addTopicModal: false,
    });
  }

  _renderContextActions(topics) {
    return (
      <div className="context-actions topics-context-actions">
        <button
          type="button"
          className={classnames({ active: this.state.topicsFilters.treeView }, 'toggle')}
          onClick={this._toggleSwitch.bind(this, 'treeView')}
        >
          Enable tree view
          <Ink/>
        </button>
        <button
          type="button"
          className={classnames({ active: this.state.topicsFilters.hideLogsTopics }, 'toggle')}
          onClick={this._toggleSwitch.bind(this, 'hideLogsTopics')}
        >
          Hide logs topics
          <Ink/>
        </button>
        {this.state.topicsFilters.topicName && topics.length > 0 && (
          <button type="button" className="toggle danger" onClick={this._openBulkDeleteModal.bind(this, topics)}>
            Delete all
            <Ink/>
          </button>
        )}
      </div>
    );
  }

  render() {
    const topics = this._filterTopics(this.state.topics);
    const filters = this.state.topicsFilters;
    return (
      <div className="topics-view grid-wrapper">
        <Loadbar timer={TopicsService.getStoredData('topics-time')} finished={!this.state.loadingTopics}/>
        {this._renderContextActions(topics)}

        <div className="grid relative">
          <div className="column">
            <section className="flex-1">
              {!this.state.loadingTopics && this.state.errorLoadingTopics && <Error/>}

              {(!this.state.loadingTopics || this.state.topics) && !this.state.errorLoadingTopics ? [
                  <header className="filter flex" key="header">
                    <h3>
                      {topics.length}
                      {' '}
                      topics
                    </h3>
                    <Filter
                      onChange={this._updateFilterComponent.bind(this)}
                      value={this.state.topicsFilters.topicName}
                      filterByRegexp={this.state.topicsFilters.filterByRegexp}
                      className="margin-right-16px"
                    />
                    <Switch
                      className="margin-left-16px"
                      onChange={this._toggleSwitch.bind(this, 'caseSensitive')}
                      value={this.state.topicsFilters.caseSensitive}
                      label="Case sensitive"
                    />
                  </header>,
                  <PerfectScrollbar
                    className="topic-datatable"
                    key="scrollbar"
                    onYReachEnd={this._onTopicScroll.bind(this)}
                  >
                    <table>
                      <thead>
                      <tr>
                        <th
                          className={classnames({
                            filtered: filters.sortBy === 'id',
                            reverse: filters.reverseSort,
                          }, 'text-left', 'pointer')}
                          onClick={this._sortBy.bind(this, 'id')}>
                          Topic Name
                        </th>
                        <th
                          className={classnames({
                            filtered: filters.sortBy === 'totalMessages',
                            reverse: filters.reverseSort,
                          }, 'text-right', 'pointer')}
                          onClick={this._sortBy.bind(this, 'totalMessages')}>
                          Total Messages
                        </th>
                        <th
                          className={classnames({
                            filtered: filters.sortBy === 'retainedMessages',
                            reverse: filters.reverseSort,
                          }, 'text-right', 'pointer')}
                          onClick={this._sortBy.bind(this, 'retainedMessages')}>
                          Retained messages
                        </th>
                        <th
                          className={classnames({
                            filtered: filters.sortBy === 'messagesPerSec',
                            reverse: filters.reverseSort,
                          }, 'text-right', 'pointer')}
                          onClick={this._sortBy.bind(this, 'messagesPerSec')}>
                          Messages Per Sec
                        </th>
                        <th
                          className={classnames({
                            filtered: filters.sortBy === 'partitions',
                            reverse: filters.reverseSort,
                          }, 'text-right', 'pointer')}
                          onClick={this._sortBy.bind(this, 'partitions')}>
                          Partitions
                        </th>
                        <th
                          className={classnames({
                            filtered: filters.sortBy === 'replications',
                            reverse: filters.reverseSort,
                          }, 'text-right', 'pointer')}
                          onClick={this._sortBy.bind(this, 'replications')}
                        >
                          {' '}
                          Replica
                        </th>
                      </tr>
                      </thead>
                      {this.state.topicsFilters.treeView ? this._renderTreeView(topics) : this._renderTopics(topics)}
                    </table>

                    <button
                      type="button"
                      className="add-topic ellipse ellipse-56px"
                      onClick={this._openAddTopicModal.bind(this)}
                    >
                      <i className="mdi mdi-plus mdi-24px"/>
                      <Ink/>
                    </button>
                  </PerfectScrollbar>,
                ]
                : <Loader/>}
            </section>
          </div>
        </div>

        {this.state.bulkDeleteModal
        && (
          <Modal
            title={`You are going to delete ${topics.length} topics`}
            close={this._closeBulkDeleteModal.bind(this)}
            className="deleteTopicsModal"
          >
            <section className="delete-topic-list">
              <PerfectScrollbar>
                {this.state.topicsToDelete.map(topic => (
                  <div
                    key={topic.id}
                    className="item"
                  >
                    {topic.id}
                  </div>
                ))}
              </PerfectScrollbar>
            </section>
            <footer>
              {this.state.askBulkDeleteConfirmation ? (
                <div className="bulk-delete-confirmation">
                  <div>
                    Please confirm by typing the number of topics you are
                    <br/>
                    going to delete (you will be fired if you screw up)
                  </div>
                  <div className="flex align-center margin-top-8px">
                    <input
                      type="text"
                      className={classnames('input-topics-number', {
                        'bad-input': this.state.badInput,
                        'good-input': this.state.badInput === false,
                      })}
                      onChange={e => this.setState({ badInput: Number(e.target.value) !== topics.length })}
                      placeholder="How many ?"
                      ref={this.inputTopicsNumber}
                    />
                    <div className="actions margin-left-24px">
                      <button
                        type="button"
                        className="danger"
                        onClick={this._deleteTopics.bind(this, topics)}
                      >
                        Confirm
                        <Ink/>
                      </button>
                      <button type="button" className="regular margin-left-8px">
                        I keep my job
                        <Ink/>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex align-center">
                  <div className="flex-1 text-right">Are you sure you want to do this ?</div>
                  <div className="actions margin-left-24px">
                    <button
                      type="button"
                      className="danger"
                      onClick={() => this.setState({ askBulkDeleteConfirmation: true })}
                    >
                      Yes
                      <Ink/>
                    </button>
                    <button
                      type="button"
                      className="regular margin-left-8px"
                      onClick={this._closeBulkDeleteModal.bind(this)}
                    >
                      {'I\'m not that crazy'}
                      <Ink/>
                    </button>
                  </div>
                </div>
              )}
            </footer>
          </Modal>
        )
        }

        {this.state.addTopicModal
        && <AddTopicModal reloadTopics={this._loadTopics.bind(this)} close={this._closeAddTopicModal.bind(this)}/>
        }

        <ToastsContainer store={ToastsStore}/>
      </div>
    );
  }
}

isPartitionsSynchronizing = (partitions) => {
  let result = false;
  partitions.forEach((partition) => {
    if (partition.replicas.length !== partition.inSyncReplicas.length) {
      result = true;
    }
  });
  return result;
};

mergeTopicsAndMetrics = (topics, metrics) => topics.map((topic) => {
  const topicBis = topic;
  topicBis.messages = '-';
  topicBis.messagesPerSec = '-';
  if (metrics && metrics[topicBis.id]) {
    topicBis.messages = 0;
    topicBis.messagesPerSec = 0;
    Object.values(metrics[topicBis.id])
      .forEach((brokerMetrics) => {
        topicBis.messages += brokerMetrics.metrics.Count;
        topicBis.messagesPerSec += brokerMetrics.metrics.FifteenMinuteRate;
      });
  }
  return topicBis;
});

getSubstringIndex = (str, substring, n) => {
  let times = 0;
  let index = null;

  while (times < n && index !== -1) {
    index = str.indexOf(substring, index + 1);
    times += 1;
  }

  return index;
};

decodeQueryParams = (params) => {
  const queryParams = querystring.decode(params);
  queryParams.topicName = queryParams.topicName || '';
  queryParams.folder = queryParams.folder || '';
  queryParams.filterByRegexp = queryParams.filterByRegexp === 'true';
  queryParams.treeView = queryParams.treeView === 'true';
  queryParams.hideLogsTopics = queryParams.hideLogsTopics === 'true';
  queryParams.caseSensitive = queryParams.caseSensitive === 'true';
  queryParams.sortBy = queryParams.sortBy || 'id';
  queryParams.reverseSort = queryParams.reverseSort === 'true';

  return queryParams;
};

export default withRouter(Topics);
