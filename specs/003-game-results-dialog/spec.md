# Feature Specification: Game Results Dialog

**Feature Branch**: `003-game-results-dialog`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Create a results dialog showing winner, 1st runner, 2nd runner and their scores when the game ends through game:end event from server"

## User Scenarios & Testing

### User Story 1 - View game results after game ends (Priority: P1)

When the game ends, all players see a results dialog displaying the final rankings. The dialog shows the winner, 1st runner-up, 2nd runner-up, and a full scoreboard of all players with their final scores. Players can dismiss the dialog to return to the room lobby.

**Why this priority**: This is the core feature — without it, players see no post-game summary and are immediately dropped back to the lobby, which is a poor user experience.

**Independent Test**: Can be fully tested by completing a game with 3+ players and observing that a results dialog appears for every player showing the correct rankings and scores.

**Acceptance Scenarios**:

1. **Given** a game is in progress with 4 players, **When** the game ends (master eliminates the blue fish or all red fish are eliminated), **Then** every player in the room receives a results dialog showing the winner, 1st runner, 2nd runner, and a full scoreboard of all players with their final scores.

2. **Given** a results dialog is displayed, **When** the player clicks the dismiss button, **Then** the dialog closes and the player transitions to the room lobby.

3. **Given** a results dialog is displayed, **When** a player has the highest score, **Then** they are shown as the winner in the first position with their score.

4. **Given** a results dialog is displayed, **When** two or more players have the same score, **Then** ties are displayed with equal ranking (e.g., both shown as winner with shared first place).

---

### User Story 2 - Handle fewer than 3 players gracefully (Priority: P2)

When a game ends with fewer than 3 remaining or participating players, the results dialog still displays 3 podium positions — empty positions show a placeholder indicating no player in that rank.

**Why this priority**: Edge cases with small player counts should be handled gracefully without confusing the player.

**Independent Test**: Can be tested by completing a game with only 2 players and observing that the 2nd runner position shows an empty/placeholder state.

**Acceptance Scenarios**:

1. **Given** a game ends with only 2 players who have final scores, **When** the results dialog appears, **Then** the winner and 1st runner positions are filled, and the 2nd runner position shows a "—" or "No player" placeholder.

2. **Given** a game ends with only 1 player, **When** the results dialog appears, **Then** the winner position is filled and both runner positions show placeholders.

---

### User Story 3 - All players see the same results (Priority: P2)

The results are consistent across all players. Every player in the room sees the same rankings and scores.

**Why this priority**: Consistency is essential for fair gameplay and trust.

**Independent Test**: Can be tested by having multiple players in a game and verifying they all receive identical results data.

**Acceptance Scenarios**:

1. **Given** a game ends, **When** multiple players receive the results dialog, **Then** all players see the same winner, runners, and scores.

---

### Edge Cases

- What happens when the game ends with no hints given (all players eliminated early)? The dialog still shows rankings based on accumulated scores; zero-score players appear at the bottom of the scoreboard.
- What happens when there is a tie for a podium position? Both tied players share the same rank, and the next distinct score takes the next rank.
- What happens if a player disconnects mid-game and reconnects after the game ends? The dialog should still appear when they receive the game state update.
- What happens when the game ends and the dialog is dismissed? The player transitions back to the room lobby view.

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a results dialog to every player when the game ends via the `game:end` event.
- **FR-002**: The results dialog MUST show the winner (1st place), 1st runner-up (2nd place), and 2nd runner-up (3rd place) with their respective scores.
- **FR-003**: The results dialog MUST display a full ranked scoreboard listing all players who participated, sorted by score descending.
- **FR-004**: The results dialog MUST show the final score for each player on the scoreboard.
- **FR-005**: Players MUST be able to dismiss the results dialog by clicking a button or tapping the screen.
- **FR-006**: When fewer than 3 players participated, the dialog MUST still display 3 podium positions with placeholders for empty ranks.
- **FR-007**: Tied scores MUST be displayed with equal ranking (e.g., two players sharing the highest score both appear as winners).
- **FR-008**: After the dialog is dismissed, the player MUST transition to the room lobby view.
- **FR-009**: The results dialog MUST be visually distinct from the in-game scoreboard to indicate the game has ended.

### Key Entities

- **GameEndDetail**: The data payload received from the server when the game ends. Contains `winner` (SocketId), `firstRunner` (SocketId), `secondRunner` (SocketId), and `finalScore` (Record of SocketId to number).
- **Player**: A participant in the game. Identified by their socket ID. Has a display name/label, role, and final score.
- **Results Dialog**: The modal UI component displayed post-game showing the final rankings.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of players in a game room receive the results dialog when the game ends.
- **SC-002**: The results dialog displays the correct winner, runners, and scores as determined by the server's `game:end` event payload.
- **SC-003**: Players can dismiss the dialog and return to the lobby in under 1 second after clicking the dismiss button.
- **SC-004**: Games with 2 players correctly show a placeholder for the 2nd runner position.
- **SC-005**: Tied scores are displayed correctly with shared rankings in all tie scenarios.

## Assumptions

- The server already emits the `game:end` event with the correct `GameEndDetail` payload (winner, firstRunner, secondRunner, finalScore). This is already implemented.
- The `game:end` event is received before or alongside the `room:sync` event that transitions players to the lobby.
- All players remain connected when the game ends (disconnected players who reconnect will also receive the results).
- The results dialog requires manual dismissal (no auto-dismiss) as specified by the user.
- The dialog will show all players' scores in a ranked list, with the top 3 highlighted as podium positions.
