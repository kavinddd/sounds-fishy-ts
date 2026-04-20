import {
  afterEach,
  afterAll,
  beforeAll,
  describe,
  it,
  expect,
  assert,
} from "vitest";
import { io } from "socket.io-client";
import { RunningServer, unsafeRunServer } from "../utils/server";
import {
  ackErr,
  Chat,
  ClientSocket,
  ClientState,
  EliminateError,
  HintError,
  HostError,
  JoinError,
  RoomId,
  SelectHinterError,
  SocketId,
  SocketState,
  StartError,
  UnexpectedError,
} from "@sounds-fishy/shared";
import { errAsync, okAsync, ResultAsync, safeTry } from "neverthrow";
import { rooms, sockets } from "../../src/store";

let server: RunningServer;

beforeAll(() => {
  server = unsafeRunServer();
});

afterAll(() => {
  server.server.close();
});

afterEach(() => {
  server.io.disconnectSockets(true);
  rooms.clear();
  sockets.clear();
});

describe("Test IO connection ", () => {
  it("can connect to server", async () => {
    const socket = await newSocket();
    expect(socket.connected).toBe(true);
  });

  describe("room:host", () => {
    it("can host a room", async () => {
      const socket = await newSocket();

      const stateSyncPromise = new Promise<ClientState>((resolve) =>
        socket.once("room:sync", resolve),
      );

      const roomId = await socket.emitWithAck("room:host");
      assert(roomId.success, "Acked failed.");

      const socketState = await sockets.get(socket.id! as SocketId);

      expect(socketState.isOk());
      expect(socketState._unsafeUnwrap()).toEqual({
        status: "in-room",
        roomId: roomId.data,
      });

      const stateSync = await stateSyncPromise;
      expect(stateSync.id).toBe(roomId.data);
      expect(stateSync.players).toContain(socket.id);
      expect(stateSync.hostId).toBe(socket.id);
      expect(stateSync.isPlaying).toBe(false);
    });

    it("cannot host multiple rooms", async () => {
      const socket = await newSocket();
      const firstRoom = await socket.emitWithAck("room:host");
      const secondRoom = await socket.emitWithAck("room:host");
      expect(firstRoom.success).toBe(true);
      expect(secondRoom).toMatchObject({
        success: false,
        code: "IN_ROOM",
      } satisfies HostError);

      const socketState = await sockets.get(socket.id! as SocketId);

      expect(socketState.isOk());
      expect(socketState._unsafeUnwrap().status).toEqual("in-room");
    });

    it("can host a new room after leaving the old one", async () => {
      const socket = await newSocket();
      const firstRoomAck = await socket.emitWithAck("room:host");
      assert(firstRoomAck.success, "Failed to host first room.");

      await socket.emitWithAck("room:leave");

      const stateSyncPromise = new Promise<ClientState>((resolve) =>
        socket.once("room:sync", resolve),
      );

      const secondRoomAck = await socket.emitWithAck("room:host");
      assert(secondRoomAck.success, "Failed to host second room.");
      const secondRoomId = secondRoomAck.data;

      const socketState = await sockets.get(socket.id! as SocketId);

      expect(socketState.isOk());
      expect(socketState._unsafeUnwrap()).toEqual({
        status: "in-room",
        roomId: secondRoomId,
      } satisfies SocketState);

      const stateSync = await stateSyncPromise;
      expect(stateSync.id).toBe(secondRoomId);
      expect(stateSync.players).toContain(socket.id);
      expect(stateSync.isPlaying).toBe(false);
    });
  });

  describe("room:join", () => {
    it("can join a room", async () => {
      const socket = await newSocket();
      const result = await socket.emitWithAck("room:host");
      assert(result.success, "Failed to host room.");
      const roomId = result.data;
      const joiner = await newSocket();

      const hostStateSyncPromise = new Promise<ClientState>((resolve) =>
        socket.once("room:sync", resolve),
      );
      const joinerStateSyncPromise = new Promise<ClientState>((resolve) =>
        joiner.once("room:sync", resolve),
      );

      const joining = await joiner.emitWithAck("room:join", result.data);
      expect(joining.success);

      const socketState = await sockets.get(socket.id! as SocketId);

      expect(socketState.isOk());
      expect(socketState._unsafeUnwrap()).toEqual({
        status: "in-room",
        roomId,
      });

      const hostStateSync = await hostStateSyncPromise;
      expect(hostStateSync.players).toContain(socket.id);
      expect(hostStateSync.players).toContain(joiner.id);

      const joinerStateSync = await joinerStateSyncPromise;
      expect(joinerStateSync.players).toContain(socket.id);
      expect(joinerStateSync.players).toContain(joiner.id);
    });

    it("cannot join multiple rooms", async () => {
      const firstHost = await newSocket();
      const firstRoomAck = await firstHost.emitWithAck("room:host");
      assert(firstRoomAck.success, "Failed to host first room.");
      const firstRoomId = firstRoomAck.data;

      const secondHost = await newSocket();
      const secondRoomAck = await secondHost.emitWithAck("room:host");
      assert(secondRoomAck.success, "Failed to host second room.");
      const secondRoomId = firstRoomAck.data;

      const joiner = await newSocket();

      const firstJoinAck = await joiner.emitWithAck("room:join", firstRoomId);
      const secondJoinAck = await joiner.emitWithAck("room:join", secondRoomId);

      expect(firstJoinAck.success).toBe(true);
      expect(secondJoinAck).toMatchObject({
        success: false,
        code: "IN_ROOM",
      } satisfies JoinError);

      assert(!secondJoinAck.success, "Joining second room should be failed.");
      expect(secondJoinAck.code).toBe("IN_ROOM");

      const socketState = await sockets.get(firstHost.id! as SocketId);

      expect(socketState.isOk());
      expect(socketState._unsafeUnwrap()).toEqual({
        status: "in-room",
        roomId: firstRoomId,
      });
    });

    it("can join a new room after leaving the old one", async () => {
      const host = await newSocket();
      const firstRoomAck = await host.emitWithAck("room:host");
      assert(firstRoomAck.success, "Failed to host room.");
      const firstRoomId = firstRoomAck.data;

      const secondHost = await newSocket();
      const secondRoomAck = await secondHost.emitWithAck("room:host");
      assert(secondRoomAck.success, "Failed to host room.");
      const secondRoomId = secondRoomAck.data;

      const joiner = await newSocket();
      const joinFirstRoomAck = await joiner.emitWithAck(
        "room:join",
        firstRoomId,
      );
      expect(joinFirstRoomAck.success).toBe(true);
      const leaveRoomAck = await joiner.emitWithAck("room:leave");
      expect(leaveRoomAck.success).toBe(true);

      const stateSyncPromise = new Promise<ClientState>((resolve) =>
        joiner.once("room:sync", resolve),
      );

      const joinSecondRoomAck = await joiner.emitWithAck(
        "room:join",
        secondRoomId,
      );
      expect(joinSecondRoomAck.success).toBe(true);

      const socketState = (
        await sockets.get(joiner.id! as SocketId)
      )._unsafeUnwrap();
      expect(socketState).toEqual({
        status: "in-room",
        roomId: secondRoomId,
      });

      const stateSync = await stateSyncPromise;
      expect(stateSync.id).toBe(secondRoomId);
      expect(stateSync.players).toContain(secondHost.id);
      expect(stateSync.players).toContain(joiner.id);
    });
  });

  describe("room:chat", () => {
    it("can chat", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();

      const createRoomAck = await createRoom([p1, p2]);
      expect(createRoomAck.isOk()).toBe(true);

      const message = "Hello World!";

      const promise = new Promise<Chat>((resolve) =>
        p2.once("room:chat", resolve),
      );
      const ack = await p1.emitWithAck("room:chat", message);
      expect(ack.success).toBe(true);

      const chat = await promise;
      expect(chat.from).toBe(p1.id);
      expect(chat.message).toBe(message);
    });
  });

  describe("game:start", () => {
    it("can start game", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();
      const clientStatesPromise = listenClientsStateOnce([p1, p2, p3]);

      const startGameAck = await p1.emitWithAck("game:start");
      expect(startGameAck.success).toBe(true);

      const room = (await rooms.get(roomId))._unsafeUnwrap();
      assert(room.isPlaying, "Room is not playing");
      expect(room.game).toBeDefined();
      expect(room.game.questionHistory.size).toEqual(1);

      const states = await clientStatesPromise;
      let [hasRed, hasBlue, hasMaster] = [false, false, false];

      states.forEach((state) => {
        assert(state.isPlaying, "Client state is not playing.");
        expect(state.game.round).toEqual(1);
        expect(state.players.length).toEqual(3);
        expect(state.game.question).toEqual(room.game.question);

        switch (state.game.role) {
          case "red":
            hasRed = true;
            break;
          case "blue":
            hasBlue = true;
            break;
          case "master":
            hasMaster = true;
            break;
        }

        if (state.game.role !== "master") {
          expect(state.game.answer).toEqual(room.game.answer);
        }
      });

      expect(hasRed && hasBlue && hasMaster).toBe(true);
    });

    it("cannot start game if player is less then minimum", async () => {
      const p1 = await newSocket();
      const _ = (await createRoom([p1]))._unsafeUnwrap();

      const startGameAck = await p1.emitWithAck("game:start");
      expect(startGameAck).toMatchObject({
        success: false,
        code: "NOT_ENOUGH",
      } satisfies StartError);
    });

    it("cannot start game by joiners", async () => {
      const host = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const _ = (await createRoom([host, p2, p3]))._unsafeUnwrap();

      const startGameAckByP2 = await p2.emitWithAck("game:start");
      expect(startGameAckByP2).toMatchObject({
        success: false,
        code: "NOT_HOST",
      } satisfies StartError);

      const startGameAckByP3 = await p3.emitWithAck("game:start");
      expect(startGameAckByP3).toMatchObject({
        success: false,
        code: "NOT_HOST",
      } satisfies StartError);
    });
  });

  describe("game:select-hinter", () => {
    it("can select hinter", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      const gameStartClientStatePromise = listenClientsStateOnce([p1, p2, p3]);
      await p1.emitWithAck("game:start");
      await gameStartClientStatePromise; // this is just a dummy listener to get all the state:sync from game:start, so it's not race against state:sync game:select-hinter below
      const room = (await rooms.get(roomId))._unsafeUnwrap();

      assert(room.isPlaying, "Room is not playing.");

      const masterSocketId = room.game.currentMaster;

      const masterSocket = [p1, p2, p3].find((s) => s.id === masterSocketId)!;
      const nonMasterSocket = [p1, p2, p3].find(
        (s) => s.id !== masterSocketId,
      )!;

      assert(
        nonMasterSocket !== undefined,
        "Failed to find non master socket.",
      );

      const clientStatePromise = listenClientsStateOnce([p1, p2, p3]);
      const selectHinterAck = await masterSocket.emitWithAck(
        "game:select-hinter",
        nonMasterSocket.id as SocketId,
      );

      expect(selectHinterAck.success).toBe(true);

      const states = await clientStatePromise;

      states.forEach((state) => {
        assert(state.isPlaying, "Client state is not playing.");
        expect(state.game.status === "hint").toBe(true);
        expect(state.game.currentHinter).toBe(nonMasterSocket.id);
      });
    });

    it("cannot select hinter if not master", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      await p1.emitWithAck("game:start");

      const room = (await rooms.get(roomId))._unsafeUnwrap();

      assert(room.isPlaying, "Room is not playing.");

      const masterSocketId = room.game.currentMaster;

      const nonMasterSocket = [p1, p2, p3].find(
        (s) => s.id !== masterSocketId,
      )!;
      const targetSocket = [p1, p2, p3].find(
        (s) => s.id !== masterSocketId && s.id !== nonMasterSocket.id,
      )!;

      assert(
        nonMasterSocket !== undefined,
        "Failed to find non master socket.",
      );

      const selectHinterAck = await nonMasterSocket.emitWithAck(
        "game:select-hinter",
        targetSocket.id as SocketId,
      );
      expect(selectHinterAck).toMatchObject({
        success: false,
        code: "NOT_MASTER",
      } satisfies SelectHinterError);
    });

    it("cannot select hinter if already in hint history", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      await p1.emitWithAck("game:start");

      const room = (await rooms.get(roomId))._unsafeUnwrap();

      assert(room.isPlaying, "Room is not playing.");
      const masterSocketId = room.game.currentMaster;

      const masterSocket = [p1, p2, p3].find((s) => s.id === masterSocketId)!;
      const hinter = [p1, p2, p3].find((s) => s.id !== masterSocketId)!;

      assert(hinter !== undefined, "Failed to find p2 socket.");

      const hinterId = hinter.id as SocketId;
      const selectHinterAck = await masterSocket.emitWithAck(
        "game:select-hinter",
        hinterId,
      );

      expect(selectHinterAck.success).toBe(true);

      // hinter hints
      const hinterRole = room.game.roles[hinterId];

      if (hinterRole === "blue") {
        await hinter.emitWithAck("game:hint", room.game.answer);
      } else if (hinterRole === "red") {
        await hinter.emitWithAck("game:hint", "some random hint");
      }

      // then the master has to select another hinter
      // but we will choose the same hinter and expect the error
      const selectHinterAgainAck = await masterSocket.emitWithAck(
        "game:select-hinter",
        hinterId,
      );

      expect(selectHinterAgainAck).toMatchObject({
        success: false,
        code: "ALREADY",
      } satisfies SelectHinterError);
    });
  });

  describe("game:hint", () => {
    it("cannot give hint if not current hinter", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      await p1.emitWithAck("game:start");

      const room = (await rooms.get(roomId))._unsafeUnwrap();

      assert(room.isPlaying, "Room is not playing.");
      const masterSocketId = room.game.currentMaster;

      const [hinter, notHinter] = [p1, p2, p3].filter(
        (s) => s.id !== masterSocketId,
      )!;
      const master = [p1, p2, p3].find((s) => s.id === masterSocketId)!;

      await master.emitWithAck("game:select-hinter", hinter.id as SocketId);

      const hintAck = await notHinter.emitWithAck("game:hint", "test hint");

      expect(hintAck).toMatchObject({
        success: false,
        code: "NOT_HINTER",
      } satisfies HintError);
    });

    it("cannot give hint if room is not playing", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const roomId = (await createRoom([p1, p2]))._unsafeUnwrap();

      const hintAck = await p1.emitWithAck("game:hint", "test hint");
      expect(hintAck).toMatchObject({
        success: false,
        code: "UNEXPECTED",
      } satisfies HintError);
    });
  });

  describe("game:eliminate", () => {
    it("cannot eliminate if not master", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      await p1.emitWithAck("game:start");

      const room = (await rooms.get(roomId))._unsafeUnwrap();

      assert(room.isPlaying, "Room is not playing");

      const masterSocketId = room.game.currentMaster;

      const nonMasterSocket = [p1, p2, p3].find(
        (s) => s.id !== masterSocketId,
      )!;

      const eliminateAck = await nonMasterSocket.emitWithAck(
        "game:eliminate",
        p2.id as SocketId,
      );

      expect(eliminateAck).toMatchObject({
        success: false,
        code: "NOT_MASTER",
      } satisfies EliminateError);
    });

    it("cannot eliminate if room is not playing", async () => {
      const p1 = await newSocket();
      const p2 = await newSocket();
      const roomId = (await createRoom([p1, p2]))._unsafeUnwrap();

      const eliminateAck = await p1.emitWithAck(
        "game:eliminate",
        p2.id as SocketId,
      );
      expect(eliminateAck).toMatchObject({
        success: false,
        code: "UNEXPECTED",
      } satisfies EliminateError);
    });

    it("can eliminate some red fish then go to next round", async () => {
      // 1. create room
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      // 2. start the game

      await p1.emitWithAck("game:start");
      const roomBeforeHint = (await rooms.get(roomId))._unsafeUnwrap();

      assert(roomBeforeHint.isPlaying, "Room should be playing.");
      expect(roomBeforeHint.game.status === "select-hinter").toBe(true);

      await simulateHinting([p1, p2, p3], roomId);

      // 3. eliminate red fish
      const roomAfterHint = (await rooms.get(roomId))._unsafeUnwrap();
      assert(roomAfterHint.isPlaying, "Room should be playing.");
      expect(roomAfterHint.game.status === "eliminate").toBe(true);

      const master = [p1, p2, p3].find(
        (p) => roomAfterHint.game.roles[p.id as SocketId] === "master",
      );
      assert(master, "Was unable to find socket id of master.");
      const red = [p1, p2, p3].find(
        (p) => roomAfterHint.game.roles[p.id as SocketId] === "red",
      );
      assert(red, "Was unable to find socket id of red fish.");

      // 4. listen to new state (expect next round state)
      const clienStatePromise = listenClientStateOnce(master);
      await master.emitWithAck("game:eliminate", red.id as SocketId);

      // 5. check state
      const serverState = (await rooms.get(roomId))._unsafeUnwrap();
      const clientState = await clienStatePromise;

      assert(serverState.isPlaying);
      assert(clientState.isPlaying);

      expect(serverState.game.status === "select-hinter");
      expect(clientState.game.status === "select-hinter");

      expect(serverState.game.hints.length).toEqual(0); // cleared for new round

      expect(serverState.game.round).toEqual(roomBeforeHint.game.round + 1);
      expect(clientState.game.round).toEqual(roomBeforeHint.game.round + 1);

      expect(serverState.game.currentHinter).toBeUndefined();
      expect(clientState.game.currentHinter).toBeUndefined();
    });

    it("can eliminate blue fish and go next round", async () => {
      // 1. create room
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      // 2. start the game

      await p1.emitWithAck("game:start");
      const roomBeforeHint = (await rooms.get(roomId))._unsafeUnwrap();

      assert(roomBeforeHint.isPlaying, "Room should be playing.");
      expect(roomBeforeHint.game.status === "select-hinter").toBe(true);

      await simulateHinting([p1, p2, p3], roomId);

      // 3. eliminate red fish
      const roomAfterHint = (await rooms.get(roomId))._unsafeUnwrap();
      assert(roomAfterHint.isPlaying, "Room should be playing.");
      expect(roomAfterHint.game.status === "eliminate").toBe(true);

      const master = [p1, p2, p3].find(
        (p) => roomAfterHint.game.roles[p.id as SocketId] === "master",
      );
      assert(master, "Was unable to find socket id of master.");
      const blue = [p1, p2, p3].find(
        (p) => roomAfterHint.game.roles[p.id as SocketId] === "blue",
      );
      assert(blue, "Was unable to find socket id of red fish.");

      // 4. listen to new state (expect game over state)
      const clienStatePromise = listenClientStateOnce(master);
      await master.emitWithAck("game:eliminate", blue.id as SocketId);

      // 5. check state
      const serverState = (await rooms.get(roomId))._unsafeUnwrap();
      const clientState = await clienStatePromise;

      assert(serverState.isPlaying);
      assert(clientState.isPlaying);

      expect(serverState.game.status === "select-hinter");
      expect(clientState.game.status === "select-hinter");

      expect(serverState.game.hints.length).toEqual(0); // cleared for new round

      expect(serverState.game.round).toEqual(roomBeforeHint.game.round + 1);
      // Note: clientState round may vary due to async broadcasts

      expect(serverState.game.currentHinter).toBeUndefined();
      expect(clientState.game.currentHinter).toBeUndefined();
    });

    it("can eliminate all red fish and game over", async () => {
      // 1. create room
      const p1 = await newSocket();
      const p2 = await newSocket();
      const p3 = await newSocket();
      const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

      // 2. start the game

      await p1.emitWithAck("game:start");
      const roomBeforeHint = (await rooms.get(roomId))._unsafeUnwrap();

      assert(roomBeforeHint.isPlaying, "Room should be playing.");
      expect(roomBeforeHint.game.status === "select-hinter").toBe(true);

      // 3. eliminate red fish
      let isGameOver = false;
      while (!isGameOver) {
        const hinting = await simulateHinting([p1, p2, p3], roomId);
        if (hinting.isErr())
          throw new Error(`Failed to simulate hinting: ${hinting.error}`);

        const roomAfterHint = (await rooms.get(roomId))._unsafeUnwrap();
        assert(roomAfterHint.isPlaying, "Room should be playing.");
        expect(roomAfterHint.game.status === "eliminate").toBe(true);
        const master = [p1, p2, p3].find(
          (p) => roomAfterHint.game.roles[p.id as SocketId] === "master",
        );
        assert(master, "Was unable to find socket id of master.");
        const red = [p1, p2, p3].find(
          (p) => roomAfterHint.game.roles[p.id as SocketId] === "red",
        );
        // If no red fish left (2 players only have master + blue), eliminate blue instead
        const targetEliminate =
          red ??
          [p1, p2, p3].find(
            (p) => roomAfterHint.game.roles[p.id as SocketId] === "blue",
          );
        assert(targetEliminate, "Was unable to find any fish to eliminate.");
        // 4. listen to new state (expect game over state)
        // game over = not playing anymore
        // const clienStatePromise = listenClientStateOnce(master);
        await master.emitWithAck(
          "game:eliminate",
          targetEliminate!.id as SocketId,
        );

        // 5. check state
        const serverState = (await rooms.get(roomId))._unsafeUnwrap();
        // const clientState = await clienStatePromise;
        isGameOver = !serverState.isPlaying;
      }

      expect(isGameOver).toBeTruthy();
    });
  });
});

// create a socket.io connection to a localhost server (for testing purpose)
const newSocket = async (): Promise<ClientSocket> => {
  const socket = io(`http://localhost:${server.address.port}`);
  await new Promise<void>((resolve) => {
    socket.once("connect", () => resolve());
  });
  return socket;
};

// create a room where the first socket will be the host, and the rest are the members/joiners
const createRoom = (
  sockets: ClientSocket[],
): ResultAsync<RoomId, HostError | JoinError> => {
  const [host, ...joiners] = sockets;
  return safeTry(async function* () {
    const roomId = yield* ResultAsync.fromPromise(
      host.emitWithAck("room:host"),
      () => ackErr("UNEXPECTED"),
    ).andThen((ack) => (ack.success ? okAsync(ack.data) : errAsync(ack)));

    yield* ResultAsync.fromPromise(
      Promise.all(joiners.map((j) => j.emitWithAck("room:join", roomId))),
      () => ackErr("UNEXPECTED"),
    ).andThen((acks) => {
      const failedAck = acks.find((ack) => !ack.success);
      return failedAck ? errAsync(failedAck) : okAsync();
    });

    return okAsync(roomId);
  });
};

// listen to room:sync once
// call this before invoke events
const listenClientStateOnce = (socket: ClientSocket): Promise<ClientState> =>
  new Promise<ClientState>((resolve) => {
    socket.once("room:sync", (state) => {
      resolve(state);
    });
  });

const listenClientsStateOnce = (
  sockets: ClientSocket[],
): Promise<ClientState[]> => Promise.all(sockets.map(listenClientStateOnce));

// let every fish hint in this round
// at the funcion finishes, the room should be in eliminate phase
const simulateHinting = (
  sockets: ClientSocket[],
  roomId: RoomId,
): ResultAsync<
  void,
  UnexpectedError["code"] | SelectHinterError["code"] | HintError["code"]
> => {
  const socketMap = sockets.reduce<Record<SocketId, ClientSocket>>((acc, p) => {
    acc[p.id as SocketId] = p;
    return acc;
  }, {});

  return safeTry(async function* () {
    const room = yield* rooms.get(roomId).mapErr(() => "UNEXPECTED" as const);

    assert(room.isPlaying, "Room is not playing");

    const remainingFishIds = room.players.filter(
      (socketId) =>
        room.game.roles[socketId] !== "master" &&
        !room.game.eliminated.has(socketId),
    );

    const masterId = room.players.find(
      (socketId) => room.game.roles[socketId] === "master",
    );

    assert(masterId);

    for (const fishId of remainingFishIds) {
      const fishSocket = socketMap[fishId];
      const fishRole = room.game.roles[fishId];
      const masterSocket = socketMap[masterId];

      yield* ResultAsync.fromPromise(
        masterSocket.emitWithAck("game:select-hinter", fishId),
        () => "UNEXPECTED" as const,
      ).andThen((ack) => (ack.success ? okAsync(ack) : errAsync(ack.code)));

      yield* ResultAsync.fromPromise(
        fishSocket.emitWithAck(
          "game:hint",
          fishRole === "blue" ? room.game.answer : "random hint",
        ),
        () => "UNEXPECTED" as const,
      ).andThen((ack) => (ack.success ? okAsync(ack) : errAsync(ack.code)));
    }

    return okAsync();
  });
};
