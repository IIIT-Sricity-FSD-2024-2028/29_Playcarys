/*
 * Concepts used in this component:
 *  - Components, Props (the signed-in user), State (the contact list from the server, who is
 *    picked, the text typed), Events (clicks, typing), Forms (controlled textarea), Hooks
 *    (useState, useEffect, useContext), Context (AdminContext for toasts), API calls (the contact
 *    directory and sending a message), Lists (groups of people)
 *
 * The "✉️ New message" card of the staff inbox. The list of people you may write to comes from the
 * server (GET /notifications/directory), so what is offered here and what the server accepts cannot
 * disagree. Pick a person, write, Send (POST /notifications).
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import { fetchDirectory, sendDirectMessage } from '../../../services/adminNotifService';
import { directoryNote } from '../../../services/staffInboxService';

export function DirectoryPanel(props) {
  const { user } = props;
  const { toast } = useContext(AdminContext);
  const [directory, setDirectory] = useState(null); // null = loading
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);   // { id, name }
  const [pickCount, setPickCount] = useState(0);     // bumps on every pick, so the box is focused each time
  const [text, setText] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    fetchDirectory(user.userId)
      .then(setDirectory)
      .catch((e) => setLoadError('Could not load the directory. ' + e.message));
  }, [user.userId]);

  // Picking someone opens the message box and puts the cursor in it (like the old page).
  useEffect(() => {
    if (pickCount > 0 && boxRef.current) boxRef.current.focus();
  }, [pickCount]);

  function pick(p) {
    setSelected({ id: p.user_id, name: p.user_name });
    setPickCount(pickCount + 1);
  }

  async function handleSend() {
    const msg = text.trim();
    if (!selected) {
      toast.error('Pick someone to message first.');
      return;
    }
    if (!msg) {
      toast.error('Write something first.');
      return;
    }
    try {
      await sendDirectMessage(user, selected.id, msg);
      setText('');
      toast.success('Sent to ' + selected.name);
    } catch (e) {
      // The server enforces the same rules, so a refusal means the two disagreed: show it as it is.
      toast.error(e.message);
    }
  }

  let note = 'Loading directory…';
  let groups = null;
  if (loadError) {
    note = loadError;
  } else if (directory) {
    if (!directory.can_contact.length) {
      note = 'Your role does not send staff messages.';
    } else {
      note = directoryNote(directory);
      groups = directory.groups.map((g) => (
        <div className="dir-group" key={g.role}>
          <div className="dir-role">{g.role}{g.people.length ? ' · ' + g.people.length : ''}</div>
          {g.people.length ? (
            g.people.map((p) => (
              <button
                className={'dir-person' + (selected && String(selected.id) === String(p.user_id) ? ' selected' : '')}
                key={p.user_id}
                data-id={p.user_id}
                onClick={() => pick(p)}
              >
                <span>{p.user_name}</span>
              </button>
            ))
          ) : (
            <div className="dir-empty">Nobody in this role yet.</div>
          )}
        </div>
      ));
    }
  }

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 .3rem', fontSize: '.95rem' }}>✉️ New message</h3>
      <p className="text-muted" style={{ margin: '0 0 .9rem', fontSize: '.72rem', lineHeight: 1.5 }} id="dir-note">
        {note}
      </p>
      <div id="directory">{groups}</div>

      <div id="compose" style={{ display: selected ? '' : 'none', marginTop: '.5rem' }}>
        <textarea
          id="compose-msg"
          ref={boxRef}
          className="form-input"
          rows="4"
          placeholder={selected ? 'Message ' + selected.name + '…' : 'Write your message…'}
          maxLength={1000}
          style={{ width: '100%', resize: 'vertical' }}
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
        <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '.5rem' }} onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}

export default DirectoryPanel;
