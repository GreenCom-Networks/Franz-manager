import React, { Component } from 'react';

import PropTypes from 'prop-types';
import Ink from 'react-ink';
import TopicsService from '../../../../services/TopicsService';
import Modal from '../../../../components/modal/Modal';

class EditPartitionsModal extends Component {
  static propTypes = {
    currentPartitions: PropTypes.number.isRequired,
    close: PropTypes.func.isRequired,
    topic: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    this.partitionInputRef = React.createRef();

    this.state = {};
  }

  _updatePartitions() {
    if (!this.partitionInputRef.current.value || Number.isNaN(this.partitionInputRef.current.value)) {
      alert('Input must be an integer.');
      return;
    } else if (Number(this.partitionInputRef.current.value) <= this.props.currentPartitions) {
      alert(`Input has to be greater than ${this.props.currentPartitions}.`);
      return;
    }
    TopicsService.addTopicPartitions(this.props.topic, Number(this.partitionInputRef.current.value) - this.props.currentPartitions)
      .then(() => {
        this.props.close();
      });
  }

  render() {
    return (
      <div className="editPartitionModal modal">
        <Modal
          title="Update partitions"
          close={this.props.close}
        >
          <section className="topic-settings flex-1 flex flex-column">
            <span className="margin-top-8px">How many partitions do you want ?</span>
            <input
              className="margin-top-16px"
              type="text"
              placeholder={this.props.currentPartitions}
              ref={this.partitionInputRef}
            />
          </section>
          <footer>
            <div className="actions margin-left-24px text-right">
              <button
                type="button"
                className="regular"
                onClick={this._updatePartitions.bind(this)}
              >
                Confirm
                <Ink />
              </button>
              <button
                type="button"
                className="regular margin-left-8px"
                onClick={this.props.close}
              >
                Close
                <Ink />
              </button>
            </div>
          </footer>
        </Modal>
      </div>
    );
  }
}

export default EditPartitionsModal;
