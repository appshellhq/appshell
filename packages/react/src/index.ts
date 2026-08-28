/*
 * The wire types, re-exported so a React package needs one dependency rather than two
 * to type what RemoteSlot hands it.
 */
export type { AppshellIndex, AppshellRemote, Metadata } from '@appshell/runtime';
export { default as RemoteSlot } from './components/RemoteSlot';
export { RemoteProvider } from './contexts/RemoteContext';
export { default as useRemote } from './hooks/useRemote';
export { default as jsonResource } from './resources/jsonResource';
