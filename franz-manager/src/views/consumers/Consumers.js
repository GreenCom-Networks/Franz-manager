import React from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import Link from 'react-router-dom/es/Link';
import Loader from '../../components/loader/Loader';
import ConsumersService from '../../services/ConsumersService';
import Error from '../../components/error/Error';
import Filter from '../../components/filter/Filter';

class Consumers extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loadingConsumers: true,
      errorLoadingConsumers: false,
      consumers: [],
      filter: '',
      filterByRegexp: false,
    };
  }

  componentWillMount() {
    ConsumersService.getConsumers()
      .then((consumers) => {
        this.setState({
          consumers: consumers.reduce((prev, next) => {
            if (!prev.find(p => p.id === next.group)) {
              prev.push({
                id: next.group,
                topics: [next.topic],
              });
            } else {
              prev.find(p => p.id === next.group)
                .topics
                .push(next.topic);
            }
            return prev;
          }, []),
          loadingConsumers: false,
        });
      })
      .catch(() => this.setState({
        loadingConsumers: false,
        errorLoadingConsumers: true,
      }));
  }

  _updateFilter(e) {
    this.setState({
      filter: e.filter,
      filterByRegexp: e.filterByRegexp,
    });
  }

  render() {
    const consumers = this.state.consumers.filter((c) => {
      if (this.state.filterByRegexp) {
        return new RegExp(this.state.filter).test(c.id);
      }
      return c.id.toLowerCase()
        .includes(this.state.filter.toLowerCase());
    });

    return (
      <div className="consumers-view grid-wrapper">
        <div className="grid">
          <div className="column">
            <section className="flex-1">
              {this.state.loadingConsumers && <Loader />}
              {this.state.errorLoadingConsumers && !this.state.loadingConsumers && <Error />}
              {!this.state.loadingConsumers && !this.state.errorLoadingConsumers
              && [
                <header className="filter flex" key="headerConsumer">
                  <h3>
                    {consumers.length}
                    {' '}
                    consumer
                    {(consumers.length > 1 ? 's' : '')}
                  </h3>
                  <Filter onChange={this._updateFilter.bind(this)} />
                </header>,
                <PerfectScrollbar className="consumers-list" key="scrollbarConsumer">
                  <div>
                    {consumers.map(consumer => (
                      <Link key={consumer.id} to={`/consumers/${consumer.id}`}>
                        <div className="consumer-item flex align-center pointer">
                          <span
                            className="list-item-stat"
                          >
                            {[...new Set(consumer.topics)].length}
                            {' topics'}
                          </span>
                          {`  ${consumer.id}`}
                        </div>
                      </Link>
                    ))}
                  </div>
                </PerfectScrollbar>,

              ]
              }
            </section>
          </div>
        </div>
      </div>
    );
  }
}

export default Consumers;
