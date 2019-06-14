import React from 'react';
import Ink from 'react-ink';
import PropTypes from 'prop-types';

const riddles = [{
  question: 'What has four fingers and a thumb, but is not living?',
  answer: 'glove',
}, {
  question: 'I have keys but no locks. I have a space but no room. You can enter, but can\'t go outside. What am I?',
  answer: 'keyboard',
}, {
  question: 'I can only live where there is light, but I die if the light shines on me. What am I?',
  answer: 'shadow',
}, {
  question: 'What flies when it’s born, lies when it’s alive, and runs when it’s dead?',
  answer: 'snow flake',
}, {
  question: 'What gets wet when drying?',
  answer: 'towel',
}, {
  question: 'Every night I’m told what to do, and each morning I do what I’m told. But I still don’t escape your scold. What i am?',
  answer: 'alarm',
}, {
  question: 'Give me food, and I will live. Give me water, and I will die. What Am I?',
  answer: 'fire',
}, {
  question: 'What comes once in a minute, twice in a moment, but never in a thousand years?',
  answer: 'm',
}, {
  question: 'I am a mother and a father but have never given birth. I’m rarely still, but I never wander. What am I?',
  answer: 'tree',
}, {
  question: 'Hurt without moving. Poison without touching. Bear the truth and the lies. Are not to be judged by our size. What are we?',
  answer: 'words',
}, {
  question: 'Which word in the dictionary is spelled incorrectly?',
  answer: 'incorrectly',
}, {
  question: 'I’m always there, some distance away. Somewhere between land or sea and sky I lay. You may move towards me, yet distant I stay. What am I?',
  answer: 'horizon',
}];


class Error extends React.Component {
  static propTypes = {
    noRiddle: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.answer = React.createRef();

    this.state = {
      riddle: riddles[Math.floor(Math.random() * riddles.length)],
      answered: false,
      correct: false,
    };
  }

  _checkRiddle() {
    this.setState({ answered: true });

    if (this.answer.value === this.state.riddle.answer) {
      this.setState({ correct: true });
    } else {
      this.setState({ correct: false });
    }
  }

  render() {
    return (
      <div className="error">
        <header><h3>Internal server error</h3></header>
        {this.props.noRiddle && <p>Something went wrong. Our best engineers are working to fix the issue.</p>}
        {!this.props.noRiddle && (
          <div>
            <p>
              {`Something went wrong. Our best engineers are working to fix the issue. In the meantime, here's a
              riddle for you:`}
            </p>
            <p className="riddle">{this.state.riddle.question}</p>
            <div className="flex align-center margin-left-8px">
              <input type="text" ref={this.answer} />
              <button type="button" onClick={this._checkRiddle.bind(this)}>
                Ok
                <Ink />
              </button>
              {this.state.correct && this.state.answered
              && <div className="riddle-success">Congratulations!</div>}
              {!this.state.correct && this.state.answered
              && <div className="riddle-failed">{'Nope! That\'s not it'}</div>}
            </div>
          </div>
        )}

      </div>
    );
  }
}

export default Error;
