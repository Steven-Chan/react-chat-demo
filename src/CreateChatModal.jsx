import React from 'react';
import skygear from 'skygear';
import skygearChat from 'skygear-chat';

import Modal from './Modal.jsx';

// EVENTS ==========================================

function getPropTypes() {
  return {
    // app loading state
    loading:            React.PropTypes.bool.isRequired,
    // add conversation to App
    // arg: [Conversation] conversation - conversation to add
    addNewConversation: React.PropTypes.func.isRequired,
    // close modal event handler
    onClose:            React.PropTypes.func.isRequired,
  };
}

function getInitialState() {
  return {
    loading:      false,  // modal loading state (boolean)
    errorMessage: '',     // error message to display (or '')
  };
}

function discoverUserAndCreateChat(
  username
) {
  if(username === skygear.currentUser.username) {
    this.setState({errorMessage: 'Error: cannot create conversation with yourself'});
    return;
  }
  this.setState({loading: true});
  skygear.discoverUserByUsernames(
    username
  ).then((users) => {
    if(users.length > 0) {
      this.setState({loading: false});
      return skygearChat.createDirectConversation(
        users[0],
        null
      );
    } else {
      this.setState({
        loading: false,
        errorMessage: `Error: user "${username}" not found`,
      });
    }
  }).then(conversation => {
    if(conversation) {
      this.props.addNewConversation(conversation);
    }
  }).catch(err => {
    this.setState({
      loading: false,
      errorMessage: `Error: ${err.message}`,
    });
  });
}

// VIEWS ==========================================

function render() {
  const {
    onClose,
  } = this.props;
  const {
    errorMessage,
  } = this.state;

  const loading = this.props.loading || this.state.loading;

  return (
    <Modal
      header="Create Direct Chat"
      onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          this.discoverUserAndCreateChat(
            e.target[0].value
          );
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '18rem',
          padding: '3rem 3rem 1rem',
        }}>
        <label>Username</label>
        <input
          disabled={loading}
          type="text"/>
        <p>{errorMessage}</p>
        <div style={{alignSelf: 'flex-end'}}>
          <input
            style={{
              backgroundColor: '#FFF',
              border: '1px solid #000',
              padding: '0.5rem 1rem',
            }}
            disabled={loading}
            type="submit"
            value="Start" />
        </div>
      </form>
    </Modal>
  );
}

// COMPONENT ======================================

export default React.createClass({
  propTypes: getPropTypes(),
  getInitialState,
  discoverUserAndCreateChat,
  render,
});

