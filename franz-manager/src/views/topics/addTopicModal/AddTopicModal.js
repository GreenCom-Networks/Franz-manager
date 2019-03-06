import React, { Component } from 'react';
import Ink from 'react-ink';

import PropTypes from 'prop-types';
import './AddTopicModal.scss';
import Modal from '../../../components/modal/Modal';
import TopicsService from '../../../services/TopicsService';

class AddTopicModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    reloadTopics: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.topicNameInputRef = React.createRef();
    this.topicPartitionsInputRef = React.createRef();
  }

  _createTopic() {
    const topicName = this.topicNameInputRef.current.value;
    const topicPartitions = Number(this.topicPartitionsInputRef.current.value);
    if (Number.isNaN(topicPartitions)) {
      alert('Partition must be a number.');
      return;
    }
    if (!topicName) {
      alert('Missing topic name.');
      return;
    }
    TopicsService.addTopic(topicName)
      .then(() => {
        this.props.reloadTopics();
        this.props.close();
      })
      .catch((e) => {
        if (e.response.body.message.includes('InvalidReplicationFactorException')) {
          alert(`Error: ${e.response.body.message.split('InvalidReplicationFactorException: ')[1]}`);
        } else {
          // TODO
        }
      });
  }

  render() {
    return (
      <div className="addTopicModal modal">
        <Modal
          title="Add topic"
          close={this.props.close}
        >
          <section>
            <input type="text" placeholder="Topic name" ref={this.topicNameInputRef} />
            <input
              type="text"
              placeholder="Partitions (default 1)"
              ref={this.topicPartitionsInputRef}
              className="margin-top-16px"
            />
          </section>
          <footer>
            <div className="actions margin-left-24px flex justify-end">
              <button
                type="button"
                className="regular"
                onClick={this._createTopic.bind(this)}
              >
                Confirm
                <Ink />
              </button>
              <button
                type="button"
                className="regular margin-left-8px"
                onClick={this.props.close}
              >
                Cancel
                <Ink />
              </button>
            </div>
          </footer>
        </Modal>
      </div>
    );
  }
}

export default AddTopicModal;
