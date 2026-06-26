// shared realtime presence channel used to count how many people are currently
// in each live room. participants in a room track { room: <id> } here while the
// room page is open; the sidebar observes this single channel to show live
// counts without subscribing to every room.
export const ROOMS_LOBBY_CHANNEL = "rooms-lobby";
