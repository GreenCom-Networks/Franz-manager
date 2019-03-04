import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import PerfectScrollbar from 'react-perfect-scrollbar';
import ConsumersService from '../../../services/ConsumersService';
import TopicsService from '../../../services/TopicsService';

import Loader from '../../../components/loader/Loader';
import Error from '../../../components/error/Error';

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

class Consumer extends Component {
  static propTypes = {
    match: PropTypes.shape({
      params: PropTypes.shape({
        consumerId: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      topics: [],
      loadingTopics: true,
      loadingTopicsError: false,
      consumerId: this.props.match.params.consumerId,
      filter: '',
    };
  }

  componentWillMount() {
    ConsumersService.getConsumers(this.state.consumerId)
      .then((consumers) => {
        this.setState({
          topics: consumers.reduce((prev, next) => {
            const res = prev;
            const nextCopy = next;
            if (!res[next.topic]) {
              res[next.topic] = [];
            }
            nextCopy.consumerOffset = next.offset;
            delete nextCopy.offset;
            res[next.topic].push(next);
            return res;
          }, {}),
        });

        const tasks = Object.keys(this.state.topics)
          .map(topic => TopicsService.getTopicPartitions(topic));
        return Promise.all(tasks);
      })
      .then((partitionsArray) => {
        const { topics } = this.state;
        const partitions = partitionsArray.flat();
        partitions.forEach((partition) => {
          const topic = topics[partition.topic].find(t => t.partition === partition.partition);
          if (topic) topic.topicOffset = partition.endOffset;
        });
        this.setState({
          topics,
          loadingTopics: false,
        });
      })
      .catch(() => {
        this.setState({ loadingTopicsError: true });
      });
  }

  _calcLag(topic) {
    const partitions = this.state.topics[topic];

    if (partitions) {
      return partitions.reduce((prev, next) => prev + (next.topicOffset - next.consumerOffset), 0);
    }

    return '?';
  }

  _updateFilter(e) {
    this.setState({ filter: e.target.value });
  }

  render() {
    const topics = Object.keys(this.state.topics || [])
      .filter(t => t.toLowerCase()
        .includes(this.state.filter.toLowerCase()));
    return (
      <div className="consumer-item-view grid-wrapper">
        <div className="grid">
          <div className="column left-column">

            {this.state.loadingTopics && !this.state.loadingTopicsError && <Loader />}
            {this.state.loadingTopicsError && <Error />}
            {!this.state.loadingTopics && !this.state.loadingTopicsError && (

              <PerfectScrollbar className="topic-consumed-list">
                <div className="topics">
                  <section>
                    <header className="filter flex">
                      <h3>
                        {`Consuming ${topics.length} topic(s)`}
                      </h3>
                      <input
                        onChange={this._updateFilter.bind(this)}
                        type="text"
                        placeholder="filter"
                        className="flex-1 margin-left-32px"
                      />
                    </header>
                  </section>

                  {topics.map(topic => (
                    <section className="topic-consumed" key={topic.id}>
                      <header className="title flex space-between">
                        <Link to={`/topics/${topic}`}>
                          <h4 className="flex-1">
                            {topic}
                            {' '}
                          </h4>
                        </Link>
                      </header>
                      <div className="topic-consumed-partitions">
                        <table>
                          <thead>
                            <tr>
                              <th className="text-left">Partition</th>
                              <th className="text-right">Topic offset</th>
                              <th className="text-right">Consumer offset</th>
                              <th className="text-right">
                              Lag
                                {' '}
                                <span
                                  className="topic-lag"
                                >
                                  ({this._calcLag(topic)})
                                </span>
                              </th>
                              <th className="text-right">Commit timestamp</th>
                            </tr>
                          </thead>

                          <tbody>
                            {
                            this.state.topics[topic].sort((a, b) => a.partition - b.partition)
                              .map((partition) => {
                                const partitionColor = partitionColors[partition.partition % partitionColors.length];
                                return (
                                  <tr
                                    className="topic-consumed-partition"
                                    key={`partitions-${partition.partition}`}
                                  >
                                    <td className="text-left flex align-center">
                                      <i
                                        className="ellipse margin-right-8px ellipse-8px"
                                        style={{ backgroundColor: partitionColor }}
                                      />
                                      {partition.partition}
                                    </td>
                                    <td className="text-right">
                                      {typeof partition.topicOffset !== 'undefined'
                                        ? partition.topicOffset.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : 'unknown'}
                                    </td>
                                    <td
                                      className="text-right"
                                    >
                                      {partition.consumerOffset.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="text-right">
                                      {typeof partition.topicOffset !== 'undefined'
                                        ? (partition.topicOffset - partition.consumerOffset).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : 'unknown'}
                                    </td>
                                    <td className="text-right">{partition.commitTimestamp}</td>
                                  </tr>
                                );
                              })
                          }
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))
                  }
                </div>
              </PerfectScrollbar>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Consumer;
