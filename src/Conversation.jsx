import React from 'react';
import skygear from 'skygear';
import skygearChat from 'skygear-chat';

import TypingDetector from './TypingDetector.jsx';

// EVENTS =================================================

function getPropTypes() {
  return {
    // target Conversation
    conversation: React.PropTypes.instanceOf(skygear.Record).isRequired,
    // show Details Modal action handler
    showDetails:  React.PropTypes.func.isRequired,
  };
}

function getInitialState() {
  const {
    conversation,
    conversation: {title}
  } = this.props;

  // initialize typing detector for this conversation
  this.typing = TypingDetector(conversation);

  return {
    title:    title || 'loading...',  // conversation title (either group name or name of first non-self participant)
    messages: [],                     // list of Message records (newest last)
    users:    {},                     // user Records by ID
  };
}

// use participant names as the conversation title if not defined
// add elipsies if the title is longer than 30 chars
function fetchUsers() {
  skygear.publicDB.query(
    new skygear.Query(skygear.UserRecord)
    .contains('_id', this.props.conversation.participant_ids)
  ).then(userList => {
    const {title} = this.props.conversation;
    let names = userList
      .filter(u => u._id !== skygear.currentUser.id)
      .map(u => u.displayName)
      .join(', ');
    if (names.length > 30) {
      names = names.substring(0,27) + '...';
    }
    const users = {};
    userList.forEach(u => users[u._id] = u);
    this.setState({
      users,
      title: title || names,
    });
  });
}

function fetchMessages() {
  skygearChat.getMessages(
    this.props.conversation
  ).then(messages => {
    skygearChat.markAsRead(messages);
    this.setState({messages: messages.reverse()});
  });
}

function typingEventHandler(events) {
  console.log('[typing events]', events);
  // TODO: set timeout for typing indicator (in case the 'finish' event is not recieved)
  const {users} = this.state;
  for(let userID in events) {
    const _id = userID.split('/')[1];
    if(events[userID].event === 'begin') {
      users[_id].typing = true;
    } else /* finish */ {
      users[_id].typing = false;
    }
  }
  this.setState({users});
}
function subscribeTypingEvent() {
  skygearChat.subscribeTypingIndicator(
    this.props.conversation,
    this.typingEventHandler
  );
}
function unsubscribeTypingEvent() {
  skygearChat.unsubscribeTypingIndicator(
    this.props.conversation
  );
}

function messageEventHandler(event) {
  const {
    props: {
      conversation
    },
    state: {
      messages
    }
  } = this;
  console.log('[message event]', event);
  if (
    event.record_type === 'message' &&
    event.record.conversation_id.id === conversation.id
  ) {
    if(event.event_type === 'create') {
      // TODO: deduplicate messages
      // TODO: ensure order by creation date
      messages.push(event.record);
      this.setState({messages});
    }
  }
}
function subscribeMessageEvent() {
  skygearChat.subscribe(
    this.messageEventHandler
  );
}
function unsubscribeMessageEvent() {
  skygearChat.unsubscribe(
    this.messageEventHandler
  );
}

function sendMessage(
  messageBody // {string} message to send
) {
  skygearChat.createMessage(
    this.props.conversation,
    messageBody,
    {userID: skygear.currentUser.id}
  );
  //.then(message => {
  //  const {messages} = this.state;
  //  messages.push(message);
  //  this.setState({messages});
  //});
}

// VIEWS ===============================================

function Message({
  message,  // {Message} message record to display
  user      // {User} the user that the message belongs to
}) {
  if(message && user) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: (skygear.currentUser && skygear.currentUser.id === user._id) ? 'flex-end' : 'flex-start',
        }}>
        <div
          style={{
            border: '1px solid #000',
            borderRadius: '100%',
            backgroundImage: `url(${user.avatar ? user.avatar.url : 'img/avatar.svg'})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            width: '2rem',
            height: '2rem',
            marginLeft: '1rem',
          }}>
        </div>
        <div
          style={{
            margin: '1rem',
            padding: '0.5rem',
            border: '1px solid #000',
            borderRadius: '10px',
          }}>
          {message.body}
        </div>
      </div>
    );
  } else {
    return null;
  }
}

function render() {
  const {
    props: {
      showDetails,
      conversation: {
        participant_count,
      }
    },
    state: {
      title,
      messages,
      users,
    },
  } = this;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '75%',
        height: '100%',
      }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '6rem',
          borderBottom: '1px solid #000',
        }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}>
          <span></span>
          <span style={{fontSize: '1.5rem'}}>
            <strong>{title}</strong>
            {` (${participant_count} people)`}
          </span>
          <img
            style={{
              height: '2rem',
              cursor: 'pointer',
              marginRight: '2rem',
            }}
            onClick={showDetails}
            src="img/info.svg"/>
        </div>
        <span style={{
          position: 'absolute',
          bottom: '0.5rem',
          left: '0.5rem',
        }}>
        {
          (_ => {
            const typingUsers =
              Object.values(users)
              .filter(u => u.typing)
              .map(u => u.displayName)
              .join(', ');
            return (typingUsers === '')? '' : `${typingUsers} is typing...`;
          })()
        }
      </span>
    </div>
    <div
      style={{
        height: '100%',
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'scroll',
      }}>
      {
        messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            user={users[m.metadata.userID]}/>
        ))
      }
    </div>
    <div
      style={{
        width: '100%',
        height: '5rem',
        display: 'flex',
        alignItem: 'center',
        borderTop: '1px solid #000',
      }}>
      <form
        style={{
          width: '100%',
          margin: '1rem',
          display: 'flex',
          alignItem: 'center',
          justifyContent: 'space-between',
        }}
        onSubmit={e => {
          e.preventDefault();
          this.sendMessage(e.target[0].value);
          e.target[0].value = '';
        }}>
        <input
          style={{
            padding: '0.25rem',
            fontSize: '1rem',
            width: '100%',
          }}
          onChange={this.typing}
          type="text"/>
        <input
          style={{
            backgroundColor: '#FFF',
            border: '1px solid #000',
            padding: '0.5rem 1rem',
            marginLeft: '1rem',
          }}
          value="Send"
          type="submit"/>
      </form>
    </div>
  </div>
  );
}

// COMPONENT ==========================================

export default React.createClass({
  propTypes: getPropTypes(),
  getInitialState,
  componentDidMount: function() {
    fetchUsers.call(this);
    fetchMessages.call(this);
    subscribeTypingEvent.call(this);
    subscribeMessageEvent.call(this);
  },
  componentWillUnmount: function() {
    // FIXME: do unsubscribe when #32 is fixed
    //unsubscribeTypingEvent.call(this);
    unsubscribeMessageEvent.call(this);
  },
  typingEventHandler,
  messageEventHandler,  
  sendMessage,
  render,
});
