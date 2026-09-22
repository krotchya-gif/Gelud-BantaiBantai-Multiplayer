export const CLIENT_EVENTS = Object.freeze({
  sessionHello: 'session:hello',
  roomCreate: 'room:create',
  roomJoin: 'room:join',
  roomLeave: 'room:leave',
  lobbyUpdateSettings: 'lobby:update-settings',
  lobbySelectCharacter: 'lobby:select-character',
  lobbyReady: 'lobby:ready',
  lobbyStart: 'lobby:start',
  inputMove: 'input:move',
  actionAttackStart: 'action:attack-start',
  actionAttackRelease: 'action:attack-release',
  actionSuper: 'action:super',
  actionItem: 'action:item',
  matchLeave: 'match:leave',
  latencyPing: 'latency:ping',
});

export const SERVER_EVENTS = Object.freeze({
  sessionAccepted: 'session:accepted',
  sessionReconnectToken: 'session:reconnect-token',
  sessionRecovered: 'session:recovered',
  roomJoined: 'room:joined',
  roomState: 'room:state',
  roomError: 'room:error',
  matchInit: 'match:init',
  matchSnapshot: 'match:snapshot',
  matchEvent: 'match:event',
  matchEnd: 'match:end',
  latencyPong: 'latency:pong',
});

export const ROOM_ERRORS = Object.freeze({
  invalidPayload: 'INVALID_PAYLOAD',
  roomNotFound: 'ROOM_NOT_FOUND',
  roomFull: 'ROOM_FULL',
  matchRunning: 'MATCH_ALREADY_RUNNING',
  notHost: 'HOST_ONLY',
  minimumPlayers: 'MINIMUM_PLAYERS_REQUIRED',
  invalidState: 'INVALID_ROOM_STATE',
  notInRoom: 'NOT_IN_ROOM',
});
