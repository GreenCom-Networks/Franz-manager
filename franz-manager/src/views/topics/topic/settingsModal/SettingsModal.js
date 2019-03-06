import React, { Component } from 'react';

import classnames from 'classnames';
import PerfectScrollbar from 'react-perfect-scrollbar';
import Ink from 'react-ink';
import PropTypes from 'prop-types';
import TopicsService from '../../../../services/TopicsService';
import Modal from '../../../../components/modal/Modal';
import Loader from '../../../../components/loader/Loader';

let getValueType;

class SettingsModal extends Component {
  static propTypes = {
    topic: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      loadingConfiguration: true,
      topicConfiguration: {
        messages: {},
        retention: {},
        replication: {},
        segment: {},
        others: {},
      },
      updatedFields: {},
      mode: 'reading',
      filter: '',
    };
  }

  componentWillMount() {
    this._loadTopicDetails(this.props.topic);
  }

  _loadTopicDetails(topicId) {
    TopicsService.getTopicDetails(topicId)
      .then((td) => {
        const { configurations } = td;
        const { topicConfiguration } = this.state;

        Object.keys(configurations).forEach((key) => {
          if (key.indexOf('message') >= 0) {
            topicConfiguration.messages[key] = configurations[key];
          } else if (key.indexOf('retention') >= 0) {
            topicConfiguration.retention[key] = configurations[key];
          } else if (key.indexOf('replica') >= 0) {
            topicConfiguration.replication[key] = configurations[key];
          } else if (key.indexOf('segment') >= 0) {
            topicConfiguration.segment[key] = configurations[key];
          } else {
            topicConfiguration.others[key] = configurations[key];
          }
        });

        this.setState({
          brutTopicConfiguration: configurations,
          topicConfiguration,
          loadingConfiguration: false,
        });
      })
      .catch(() => {
        this.setState({ loadingConfiguration: false });
      });
  }

  _updateTopicConfiguration() {
    if (Object.keys(this.state.updatedFields).length > 0) {
      try {
        const configuration = this.state.brutTopicConfiguration;
        for (const key in this.state.updatedFields) {
          configuration[key] = this.state.updatedFields[key];
        }
        this.setState({
          topicConfiguration: {
            messages: {},
            retention: {},
            replication: {},
            segment: {},
            others: {},
          },
          loadingConfiguration: true,
          mode: 'reading',
        });
        TopicsService.updateTopicConfiguration(this.props.topic, configuration)
          .then(() => {
            setTimeout(() => this._loadTopicDetails(this.props.topic), 100);
          });
      } catch (e) {
        // TODO
      }
    }
  }

  _editMode() {
    this.setState({ mode: 'edition' });
  }

  _readingMode() {
    this.setState({ mode: 'reading' });
  }

  _onFieldChange(e) {
    const { updatedFields } = this.state;
    const valueType = getValueType(e.target.value);
    switch (valueType) {
      case 'boolean':
        updatedFields[e.target.name] = e.target.value === 'true';
        break;
      case 'number':
        updatedFields[e.target.name] = parseFloat(e.target.value);
        break;
      case 'null':
        updatedFields[e.target.name] = null;
        break;
      default:
        updatedFields[e.target.name] = e.target.value;
        break;
    }
    this.setState({ updatedFields });
  }

  render() {
    return (
      <div className="settingsModal modal">
        <Modal
          title="Settings"
          close={this.props.close}
          actions={this.state.mode === 'reading' ? [{
            action: this._editMode.bind(this),
            label: 'Edit',
          }] : [{ action: this._readingMode.bind(this), label: 'Cancel' }, {
            action: this._updateTopicConfiguration.bind(this),
            label: 'Save',
          }]}
        >
          {this.state.loadingConfiguration ? <Loader />
            : [
              <section className="topic-settings flex-1">
                <PerfectScrollbar className="scrollbar settings-list">
                  {
                    Object.keys(this.state.topicConfiguration)
                      .filter(configurationGroupKey => Object.keys(this.state.topicConfiguration[configurationGroupKey]).find(key => key.includes(this.state.filter)))
                      .map(configurationGroupKey => (
                        <div
                          className="margin-top-16px"
                          key={`${configurationGroupKey}`}
                        >
                          <h4>{configurationGroupKey}</h4>
                          {
                            Object.keys(this.state.topicConfiguration[configurationGroupKey])
                              .filter(key => key.includes(this.state.filter))
                              .sort((a, b) => (a < b ? -1 : 1))
                              .map(configurationKey => (
                                <div
                                  className="settings-item flex space-between align-center"
                                  key={`${configurationKey}`}
                                >
                                  <span
                                    className="settings-line-key"
                                  >
                                    {configurationKey}
                                  :
                                  </span>
                                  {this.state.mode === 'reading' ? (
                                    <span
                                      className={classnames(`settings-line-${getValueType(this.state.topicConfiguration[configurationGroupKey][configurationKey])}`)}
                                    >
                                      {this.state.topicConfiguration[configurationGroupKey][configurationKey] || 'null'}
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      className="setting-edit"
                                      name={configurationKey}
                                      defaultValue={this.state.topicConfiguration[configurationGroupKey][configurationKey] || 'null'}
                                      onChange={this._onFieldChange.bind(this)}
                                    />
                                  )
                                  }

                                </div>
                              ))
                          }
                        </div>
                      ))
                  }
                </PerfectScrollbar>
              </section>,
              <footer>

                <div className="actions margin-left-24px text-right">
                  <button
                    type="button"
                    className="regular"
                    onClick={this.props.close}
                  >
                    Close
                    <Ink />
                  </button>
                </div>
              </footer>]}


        </Modal>
      </div>
    );
  }
}

getValueType = (value) => {
  if (value === 'true' || typeof value === 'boolean') return 'boolean';
  if (Number(value) === parseInt(value, 10) || Number(value) === parseFloat(value)) return 'number';
  if (value === 'null' || value === '' || typeof value === 'undefined' || value === null) return 'null';
  return 'string';
};

export default SettingsModal;
