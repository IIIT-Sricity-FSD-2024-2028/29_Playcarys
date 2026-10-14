/*
 * Concepts used in this component:
 *  - Components, Props (game, index, size, extraStyle), State (did the picture fail to load?),
 *    Events (image onError), Hooks (useState)
 *
 * Replaces the old getGameIconHTML(game, index, size, extraStyles): the game's cover
 * picture, or a coloured tile with an emoji when there is no picture or it fails to load.
 * The picture and colour lookup is the one the Publisher pages already use.
 */
import React, { useState } from 'react';
import { getGameVisualInfo } from '../../../services/publisherService';

export function GameIcon(props) {
  const { game, index = 0, size = '60px', extraStyle } = props;
  const [failed, setFailed] = useState(false);

  const visual = getGameVisualInfo(game, index);
  const tileBase = {
    width: size,
    height: size,
    background: visual.bgColor,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-primary)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'calc(' + size + ' * 0.5)'
  };

  // No picture: a coloured tile with the emoji.
  if (!visual.imgSrc) {
    return <div style={{ ...tileBase, ...extraStyle }}>{visual.emoji}</div>;
  }

  // Picture, with the emoji tile underneath that appears if the picture fails.
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...extraStyle }}>
      <img
        src={visual.imgSrc}
        alt={game.title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          display: failed ? 'none' : 'block'
        }}
        onError={() => setFailed(true)}
      />
      <div
        style={{
          display: failed ? 'flex' : 'none',
          width: '100%',
          height: '100%',
          background: visual.bgColor,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'calc(' + size + ' * 0.5)'
        }}
      >
        {visual.emoji}
      </div>
    </div>
  );
}

export default GameIcon;
