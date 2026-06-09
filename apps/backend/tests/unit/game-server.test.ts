import { describe, expect, it } from "vitest";
import { assignRolesToPlayers, calcScore } from "../../src/game-server";
import { Role, Round, SocketId } from "@sounds-fishy/shared";

describe("assigning role", () => {
  it("2 players, everyone gets unique roles", () => {
    const players = ["1", "2"] as SocketId[];
    const roles = assignRolesToPlayers(players);
    expect(Object.entries(roles)).toHaveLength(2);
  });

  it("3 players, everyone gets unique roles", () => {
    const players = ["1", "2", "3"] as SocketId[];
    const roles = assignRolesToPlayers(players);
    expect(Object.entries(roles)).toHaveLength(3);
  });

  it("3 players, 1 non masters, non master should not ever be master", () => {
    const players = ["1", "2", "3"] as SocketId[];

    for (let i = 0; i < 30; i++) {
      const roles = assignRolesToPlayers(players, new Set(["1" as SocketId]));
      expect(Object.entries(roles)).toHaveLength(3);
      expect(roles["1" as SocketId] !== "master").toBeTruthy();
    }
  });

  it("3 players, 2 non masters, non master should not ever be master", () => {
    const players = ["1", "2", "3"] as SocketId[];
    const nonMasters = new Set(["1", "2"] as SocketId[]);

    for (let i = 0; i < 30; i++) {
      const roles = assignRolesToPlayers(players, nonMasters);
      expect(Object.entries(roles)).toHaveLength(3);
      expect(roles["1" as SocketId] !== "master").toBeTruthy();
      expect(roles["2" as SocketId] !== "master").toBeTruthy();
    }
  });

  // TODO:
  //
  // it('3 players, 3 non masters, should error', () => {
  //    const players = ['1', '2', '3'] as SocketId[]
  //    const nonMasters = new Set(['1', '2', '3'] as SocketId[])
  //
  // })
});

describe("scoring", () => {
  describe("single round", () => {
    it("master gets one score by eliminate single red fish", () => {
      const players = ["1", "2", "3"] as SocketId[];

      const rounds: Round[] = [
        makeRound({
          round: 1,
          question: "Test",
          role: {
            red: "1",
            blue: "2",
            master: "3",
          },
          eliminated: ["1"],
        }),
      ];

      const score = calcScore(players, rounds);
      expect(score["1" as SocketId]).toBe(0);
      expect(score["2" as SocketId]).toBe(0);
      expect(score["3" as SocketId]).toBe(1);
    });

    it("master gets two scores by eliminate two red fish", () => {
      const players = ["1", "2", "3", "4"] as SocketId[];

      const rounds: Round[] = [
        makeRound({
          round: 1,
          question: "Test",
          role: {
            red: ["1", "4"],
            blue: "2",
            master: "3",
          },
          eliminated: ["1", "4"],
        }),
      ];

      const score = calcScore(players, rounds);
      expect(score["1" as SocketId]).toBe(0);
      expect(score["2" as SocketId]).toBe(0);
      expect(score["3" as SocketId]).toBe(2);
      expect(score["4" as SocketId]).toBe(0);
    });

    it("red gets score if is not eliminated", () => {
      const players = ["1", "2", "3", "4"] as SocketId[];

      const rounds: Round[] = [
        makeRound({
          round: 1,
          question: "Test",
          role: {
            red: ["1", "4"],
            blue: "2",
            master: "3",
          },
          eliminated: ["1"],
        }),
      ];

      const score = calcScore(players, rounds);

      expect(score["1" as SocketId]).toBe(0);
      expect(score["2" as SocketId]).toBe(0);
      expect(score["3" as SocketId]).toBe(1);
      expect(score["4" as SocketId]).toBe(1);
    });

    it("blue gets score, if get eliminated", () => {
      const players = ["1", "2", "3"] as SocketId[];

      const rounds: Round[] = [
        makeRound({
          round: 1,
          question: "Test",
          role: {
            red: "1",
            blue: "2",
            master: "3",
          },
          eliminated: ["2"],
        }),
      ];

      const score = calcScore(players, rounds);
      expect(score["1" as SocketId]).toBe(1);
      expect(score["2" as SocketId]).toBe(2);
      expect(score["3" as SocketId]).toBe(0);
    });
  });

  describe("multiple rounds", () => {
    it("4 people - eliminate blue only", () => {
      const players = ["1", "2", "3", "4"] as SocketId[];

      testMultipleRounds([
        {
          round: makeRound({
            round: 1,
            question: "Test",
            role: {
              red: ["3", "4"],
              blue: "2",
              master: "1",
            },
            eliminated: ["2"],
          }),
          expectedScore: makeScore({
            "1": 0,
            "2": 2,
            "3": 1,
            "4": 1,
          }),
        },
        {
          round: makeRound({
            round: 2,
            question: "Test",
            role: {
              red: ["1", "4"],
              blue: "3",
              master: "2",
            },
            eliminated: ["3"],
          }),
          expectedScore: makeScore({
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 2,
          }),
        },
        {
          round: makeRound({
            round: 3,
            question: "Test",
            role: {
              red: ["2", "1"],
              blue: "4",
              master: "3",
            },
            eliminated: ["4"],
          }),
          expectedScore: makeScore({
            "1": 2,
            "2": 3,
            "3": 3,
            "4": 4,
          }),
        },
        {
          round: makeRound({
            round: 4,
            question: "Test",
            role: {
              red: ["2", "3"],
              blue: "1",
              master: "4",
            },
            eliminated: ["1"],
          }),
          expectedScore: makeScore({
            "1": 4,
            "2": 4,
            "3": 4,
            "4": 4,
          }),
        },
      ]);
    });
  });
});

// region: helpers
interface TestCase {
  round: Round;
  expectedScore: Record<SocketId, number>;
}

const testMultipleRounds = (testCases: TestCase[]): void => {
  const players = Object.keys(testCases[0].round.roles) as SocketId[];

  for (let i = 0; i < testCases.length; i++) {
    const roundsWindow = testCases.slice(0, i + 1).map((it) => it.round);

    const score = calcScore(players, roundsWindow);

    const { expectedScore } = testCases[i];
    expect(score).toMatchObject(expectedScore);
  }
};

// just for bypassing type error
const makeScore = (score: Record<string, number>): Record<SocketId, number> =>
  score as Record<SocketId, number>;

interface MakeRoundParams {
  round: number;
  question: string;
  role: { [K in Role]: K extends "red" ? unknown[] | unknown : unknown };
  eliminated: unknown[];
}

const makeRound = ({
  round,
  question,
  role,
  eliminated,
}: MakeRoundParams): Round => {
  const reds = role["red"] as SocketId[];
  const blueFish = role["blue"] as SocketId;
  const master = role["master"] as SocketId;

  return {
    round,
    question,
    eliminated: new Set([...eliminated] as SocketId[]),
    blueFish,
    master,
    roles: makeRoles(reds, blueFish, master),
  };
};

const makeRoles = (
  reds: unknown | unknown[],
  blue: unknown,
  master: unknown,
): Record<SocketId, Role> => {
  const redsRole = Array.isArray(reds)
    ? Object.fromEntries((reds as SocketId[]).map((r) => [r, "red" as const]))
    : { [reds as SocketId]: "red" as const };
  return {
    [blue as SocketId]: "blue",
    [master as SocketId]: "master",
    ...redsRole,
  };
};

// endregion: helpers to create state
//
// describe('random problem', () => {
// 	// it('test', () => {
// 	//
// 	// })
// })
