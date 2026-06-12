import { useQueryClient } from '@tanstack/react-query';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RoundTransitionOverlay } from '../components/game/RoundTransitionOverlay';

import {
  SOCKET_EVENTS,
  type ChessState,
  type GameFinishedPayload,
  type ChatMessage,
  type GameStatePayload,
  type ImageGuessState,
  type RoomDetails,
  type RoomErrorPayload,
  type RoomGameStartedPayload,
  type TicTacToeState
} from '@game-platform/shared';
import Phaser from 'phaser';
import { useNavigate, useParams } from 'react-router-dom';
import { ProfileBottomSheet } from '../components/profile/ProfileBottomSheet';
import { Dialog } from '../components/ui/Dialog';
import { TutorialDialog } from '../components/ui/TutorialDialog';
import { ChatPanel } from '../components/chat/ChatPanel';
import { VoiceAudioRenderer } from '../components/voice/VoiceAudioRenderer';
import { ChessBoard } from '../features/game/chess/ChessBoard';
import { ChessTutorial } from '../features/game/chess/tutorial';
import { انتخاب_خودکار_تصادفی as انتخاب_خودکار_تصادفی_شطرنج } from '../features/game/chess/random-auto-select';
import { PhaserGame } from '../features/game/phaser/PhaserGame';
import { createTicTacToePhaserConfig, syncTicTacToeScene } from '../features/game/tic-tac-toe/TicTacToeScene';
import { TicTacToeTutorial } from '../features/game/tic-tac-toe/tutorial';
import { انتخاب_خودکار_تصادفی as انتخاب_خودکار_تصادفی_دوز } from '../features/game/tic-tac-toe/random-auto-select';
import { fetchActiveMatch, fetchRoom } from '../lib/api';
import { isPendingRoomLeave, markPendingRoomLeave } from '../lib/pendingRoomLeave';
import { getLobbySocket } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useVoiceStore } from '../stores/voiceStore';
import { PlayerAvatarCard } from '../components/game/PlayerAvatarCard';

const LEAVE_GAME_XP_PENALTY = 10;
const LEAVE_GAME_SCORE_PENALTY = 100;

function isTicTacToeState(state: unknown): state is TicTacToeState {
  return Boolean(state && typeof state === 'object' && 'game' in state && state.game === 'tic_tac_toe');
}

function isImageGuessState(state: unknown): state is ImageGuessState {
  return Boolean(state && typeof state === 'object' && 'game' in state && state.game === 'image_guess');
}

function isChessState(state: unknown): state is ChessState {
  return Boolean(state && typeof state === 'object' && 'game' in state && state.game === 'chess');
}

function roundMessage(state: TicTacToeState): string | null {
  if (state.status === 'finished') {
    if (!state.matchWinnerUserId) {
      return 'Match finished in a draw.';
    }

    const winner = state.players.find((player) => player.userId === state.matchWinnerUserId);
    return `${winner?.username ?? 'A player'} wins the match.`;
  }

  if (!state.lastRoundResult) {
    return null;
  }

  if (state.lastRoundResult.isDraw) {
    return `Round ${state.lastRoundResult.round} ended in a draw.`;
  }

  const winner = state.players.find((player) => player.userId === state.lastRoundResult?.winnerUserId);
  return `${winner?.username ?? 'A player'} won round ${state.lastRoundResult.round}.`;
}

type TicTacToePhaserBoardProps = {
  state: TicTacToeState;
  currentUserId: string | null;
  onCellClick: (row: number, col: number) => void;
};

function TicTacToePhaserBoard({ state, currentUserId, onCellClick }: TicTacToePhaserBoardProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const latestClickRef = useRef(onCellClick);

  useEffect(() => {
    latestClickRef.current = onCellClick;
  }, [onCellClick]);

  const handleCellIntent = useCallback((intent: { row: number; col: number }) => {
    latestClickRef.current(intent.row, intent.col);
  }, []);

  const config = useMemo(() => createTicTacToePhaserConfig(), []);

  useEffect(() => {
    if (gameRef.current) {
      syncTicTacToeScene(gameRef.current, state, currentUserId, handleCellIntent);
    }
  }, [state, currentUserId, handleCellIntent]);

  return (
    <PhaserGame
      config={config}
      className="min-h-[260px] w-full overflow-hidden rounded-[1.5rem] bg-canvas shadow-xl shadow-ink/15 sm:min-h-[320px] [&_canvas]:mx-auto [&_canvas]:block [&_canvas]:max-w-full"
      fallback={<HtmlTicTacToeBoard state={state} currentUserId={currentUserId} onCellClick={onCellClick} />}
      onReady={(game) => {
        gameRef.current = game;
        syncTicTacToeScene(game, state, currentUserId, handleCellIntent);
      }}
    />
  );
}

function HtmlTicTacToeBoard({ state, currentUserId, onCellClick }: TicTacToePhaserBoardProps) {
  return (
    <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 rounded-[1.5rem] bg-ink p-2 shadow-xl shadow-ink/20 sm:max-w-lg sm:gap-3 sm:p-3">
      {state.board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isDisabled =
            state.status !== 'playing' ||
            state.currentTurnUserId !== currentUserId ||
            Boolean(cell) ||
            Boolean(state.roundTransitionAt) ||
            Boolean(state.matchTransitionAt);

          return (
            <button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              onClick={() => onCellClick(rowIndex, colIndex)}
              disabled={isDisabled}
              className="aspect-square rounded-2xl bg-white font-display text-5xl font-black text-ink shadow-inner transition hover:bg-moss/10 disabled:cursor-not-allowed disabled:hover:bg-white sm:text-6xl"
            >
              {cell ?? ''}
            </button>
          );
        })
      )}
    </div>
  );
}

type ImageGuessBoardProps = {
  state: ImageGuessState;
  currentUserId: string | null;
  onItemSelect: (itemId: string) => void;
};

function ImageGuessBoard({ state, currentUserId, onItemSelect }: ImageGuessBoardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
      {state.items.map((item, index) => {
        const isDisabled = state.status !== 'playing' || state.currentTurnUserId !== currentUserId || item.revealed;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemSelect(item.id)}
            disabled={isDisabled}
            className={`aspect-[4/3] rounded-3xl p-4 text-left shadow-inner transition ${
              item.revealed
                ? 'bg-moss/15 text-moss ring-2 ring-moss/25'
                : 'bg-ink text-white hover:-translate-y-1 hover:bg-ink/90 disabled:hover:translate-y-0 disabled:hover:bg-ink'
            } disabled:cursor-not-allowed disabled:opacity-75`}
          >
            <span className="text-xs font-black uppercase tracking-[0.18em] opacity-60">Image {index + 1}</span>

            <span className="mt-3 block font-display text-2xl font-black">
              {item.revealed ? item.imageKey : 'Mystery'}
            </span>

            <span className="mt-2 block text-sm font-bold opacity-70">
              {item.revealed
                ? `Selected by ${
                    state.players.find((player) => player.userId === item.selectedByUserId)?.username ?? 'Player'
                  }`
                : 'Select to reveal'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type ProfileSheetUser = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export function GamePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);
  const activeGame = useGameStore((state) => state.activeGame);
  const setActiveGame = useGameStore((state) => state.setActiveGame);
  const setLastFinishedGame = useGameStore((state) => state.setLastFinishedGame);
  const clearActiveGame = useGameStore((state) => state.clearActiveGame);

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChatMicActive, setIsChatMicActive] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSheetUser | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeavingGame, setIsLeavingGame] = useState(false);

  const [roundOverlay, setRoundOverlay] = useState<{ currentRound: number; rounds: number } | null>(null);
  const [floatingChatMessages, setFloatingChatMessages] = useState<Record<string, ChatMessage>>({});

  const voiceStatus = useVoiceStore((state) => state.status);
  const voiceRoomId = useVoiceStore((state) => state.roomId);
  const remoteStreams = useVoiceStore((state) => state.remoteStreams);
  const setMuted = useVoiceStore((state) => state.setMuted);
  const clearVoiceError = useVoiceStore((state) => state.clearError);

  useEffect(() => {
    let isMounted = true;

    async function loadRoomAndMatch() {
      if (!roomId || !token) {
        return;
      }

      try {
        const [roomDetails, activeMatch] = await Promise.all([
          fetchRoom(roomId, token),
          activeGame?.roomId === roomId ? Promise.resolve(null) : fetchActiveMatch(roomId, token)
        ]);

        if (isMounted) {
          setRoom(roomDetails);
          const currentMatch = activeMatch ?? roomDetails.activeMatch;

          if (currentMatch) {
            setActiveGame({
              roomId,
              matchId: currentMatch.matchId,
              gameSlug: currentMatch.gameSlug,
              state: currentMatch.state
            });
          }
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load game room');
        }
      }
    }

    void loadRoomAndMatch();

    return () => {
      isMounted = false;
    };
  }, [activeGame?.roomId, roomId, setActiveGame, token]);

  useEffect(() => {
    if (!roomId || !token) {
      return;
    }

    const socket = getLobbySocket(token);

    const handleRoomState = (state: RoomDetails) => {
      if (state.id !== roomId) {
        return;
      }

      setRoom(state);

      if (state.status === 'in_game' && state.activeMatch) {
        setActiveGame({
          roomId: state.id,
          matchId: state.activeMatch.matchId,
          gameSlug: state.activeMatch.gameSlug,
          state: state.activeMatch.state
        });
      }

      if (state.status === 'waiting') {
        clearActiveGame();
      }
    };

    const handleGameStarted = (payload: RoomGameStartedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setActiveGame({
        roomId: payload.roomId,
        matchId: payload.matchId,
        gameSlug: payload.gameSlug,
        state: payload.initialState
      });

      setError(null);
    };

    const handleGameState = (payload: GameStatePayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setActiveGame({
        roomId: payload.roomId,
        matchId: payload.matchId,
        gameSlug: payload.gameSlug,
        state: payload.state
      });

      setError(null);
    };

    const handleGameFinished = (payload: GameFinishedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setLastFinishedGame(payload);
      clearActiveGame();
      void queryClient.invalidateQueries({ queryKey: ['recent-game-results'] });
      void refreshCurrentUser();
      
      if (isPendingRoomLeave(roomId)) {
        navigate('/', { replace: true });
      } else {
        navigate(`/rooms/${roomId}`, { replace: true });
      }
    };

    const handleError = (payload: RoomErrorPayload) => setError(payload.message);
    const handleConnect = () => {
      if (!isPendingRoomLeave(roomId)) {
        socket.emit(SOCKET_EVENTS.roomJoin, { roomId });
      }
    };

    socket.on(SOCKET_EVENTS.roomState, handleRoomState);
    socket.on(SOCKET_EVENTS.roomGameStarted, handleGameStarted);
    socket.on(SOCKET_EVENTS.gameState, handleGameState);
    socket.on(SOCKET_EVENTS.gameFinished, handleGameFinished);
    socket.on(SOCKET_EVENTS.roomError, handleError);
    socket.on(SOCKET_EVENTS.gameError, handleError);
    socket.on('connect', handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off(SOCKET_EVENTS.roomState, handleRoomState);
      socket.off(SOCKET_EVENTS.roomGameStarted, handleGameStarted);
      socket.off(SOCKET_EVENTS.gameState, handleGameState);
      socket.off(SOCKET_EVENTS.gameFinished, handleGameFinished);
      socket.off(SOCKET_EVENTS.roomError, handleError);
      socket.off(SOCKET_EVENTS.gameError, handleError);
      socket.off('connect', handleConnect);
    };
  }, [clearActiveGame, roomId, setActiveGame, queryClient, refreshCurrentUser, setLastFinishedGame, token, navigate]);

  const currentGame = activeGame?.roomId === roomId ? activeGame : null;
  const ticTacToeState = isTicTacToeState(currentGame?.state) ? currentGame.state : null;
  const imageGuessState = isImageGuessState(currentGame?.state) ? currentGame.state : null;
  const chessState = isChessState(currentGame?.state) ? currentGame.state : null;
  const statusMessage = useMemo(() => (ticTacToeState ? roundMessage(ticTacToeState) : null), [ticTacToeState]);
  const roomPlayersByUserId = useMemo(
    () => new Map(room?.players.map((player) => [player.userId, player]) ?? []),
    [room?.players]
  );

  useEffect(() => {
    if (!ticTacToeState) {
      setRoundOverlay(null);
      return;
    }

    if (!ticTacToeState.roundTransitionAt) {
      setRoundOverlay(null);
      return;
    }

    const nextRound = Math.min(
      (ticTacToeState.lastRoundResult?.round ?? ticTacToeState.currentRound) + 1,
      ticTacToeState.rounds
    );

    setRoundOverlay({
      currentRound: nextRound,
      rounds: ticTacToeState.rounds
    });
  }, [ticTacToeState]);

  const handleFloatingChatMessage = useCallback((message: ChatMessage) => {
    setFloatingChatMessages((currentMessages) => ({
      ...currentMessages,
      [message.userId]: message
    }));
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!roomId || !token || !currentGame || !ticTacToeState || !user) {
        return;
      }

      const isMyTurn = ticTacToeState.currentTurnUserId === user.id;

      if (
        !isMyTurn ||
        ticTacToeState.board[row]?.[col] ||
        ticTacToeState.status !== 'playing' ||
        ticTacToeState.roundTransitionAt ||
        ticTacToeState.matchTransitionAt
      ) {
        return;
      }

      const socket = getLobbySocket(token);

      socket.emit(SOCKET_EVENTS.gameAction, {
        roomId,
        matchId: currentGame.matchId,
        type: 'tic_tac_toe:place',
        payload: { row, col }
      });
    },
    [currentGame, roomId, ticTacToeState, token, user]
  );

  const handleRandomTicTacToeSelect = useCallback(() => {
    if (!ticTacToeState) {
      return;
    }

    const selectedCell = انتخاب_خودکار_تصادفی_دوز(ticTacToeState);
    if (!selectedCell) {
      return;
    }

    handleCellClick(selectedCell.row, selectedCell.col);
  }, [handleCellClick, ticTacToeState]);

  const handleImageGuessSelect = useCallback(
    (itemId: string) => {
      if (!roomId || !token || !currentGame || !imageGuessState || !user) {
        return;
      }

      const item = imageGuessState.items.find((candidate) => candidate.id === itemId);
      const isMyTurn = imageGuessState.currentTurnUserId === user.id;

      if (!item || item.revealed || !isMyTurn || imageGuessState.status !== 'playing') {
        return;
      }

      const socket = getLobbySocket(token);

      socket.emit(SOCKET_EVENTS.gameAction, {
        roomId,
        matchId: currentGame.matchId,
        type: 'image_guess:select',
        payload: { itemId }
      });
    },
    [currentGame, imageGuessState, roomId, token, user]
  );

  const handleChessMove = useCallback(
    (from: { row: number; col: number }, to: { row: number; col: number }) => {
      if (!roomId || !token || !currentGame || !chessState || !user) {
        return;
      }

      if (chessState.status !== 'playing' || chessState.currentTurnUserId !== user.id) {
        return;
      }

      const socket = getLobbySocket(token);

      socket.emit(SOCKET_EVENTS.gameAction, {
        roomId,
        matchId: currentGame.matchId,
        type: 'chess:move',
        payload: { from, to }
      });
    },
    [chessState, currentGame, roomId, token, user]
  );

  const handleRandomChessMove = useCallback(() => {
    if (!chessState) {
      return;
    }

    const selectedMove = انتخاب_خودکار_تصادفی_شطرنج(chessState, user?.id ?? null);
    if (!selectedMove) {
      return;
    }

    handleChessMove(selectedMove.from, selectedMove.to);
  }, [chessState, handleChessMove, user?.id]);

  function handleChatMicStart() {
    if (!roomId) {
      return;
    }

    if (!(voiceStatus === 'joined' && voiceRoomId === roomId)) {
      return;
    }

    clearVoiceError();
    setIsChatMicActive(true);
    setMuted(false);
  }

  function handleChatMicEnd() {
    if (!roomId) {
      return;
    }

    if (!(voiceStatus === 'joined' && voiceRoomId === roomId)) {
      return;
    }

    setIsChatMicActive(false);
    setMuted(true);
  }

  function openProfile(profileUser: ProfileSheetUser) {
    if (profileUser.userId === user?.id) {
      return;
    }

    setSelectedProfile(profileUser);
  }

  function handleConfirmLeaveGame() {
    if (!roomId || !token || !currentGame) {
      return;
    }

    const socket = getLobbySocket(token);
    setIsLeavingGame(true);
    socket.emit(
      SOCKET_EVENTS.gameLeave,
      {
        roomId,
        matchId: currentGame.matchId
      },
      (response) => {
        setIsLeavingGame(false);

        if (!response.ok) {
          setError(response.message ?? 'خروج از بازی انجام نشد');
          return;
        }

        markPendingRoomLeave(roomId);
        clearActiveGame();
        setIsLeaveDialogOpen(false);
      }
    );
  }

  function handleCancelRequest() {
    if (!roomId || !token || !currentGame) {
      return;
    }

    const socket = getLobbySocket(token);
    socket.emit(SOCKET_EVENTS.gameCancelRequest, {
      roomId,
      matchId: currentGame.matchId
    });
  }

  if (!roomId || !token) {
    return (
      <div className="rounded-[1.5rem] border border-ember/20 bg-ember/10 p-6 font-bold text-ember">
        Missing game session.
      </div>
    );
  }

  return (
    <>
      {roundOverlay ? (
        <RoundTransitionOverlay
          currentRound={roundOverlay.currentRound}
          rounds={roundOverlay.rounds}
        />
      ) : null}

      <section className="relative mx-auto w-full max-w-md space-y-4 px-3 pt-2 pb-[120px] sm:max-w-2xl">
        <header className="sticky top-0 z-40 -mx-3 flex items-center justify-between gap-3 bg-canvas/95 px-3 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-black text-ink/50">بازی در حال اجرا</p>
            <h1 className="truncate font-display text-xl font-black text-ink">{room?.game.name ?? 'Game'}</h1>
          </div>

          <div className="flex shrink-0 gap-2">
            {isChessState(currentGame?.state) ? (
              <ChessTutorial />
            ) : isTicTacToeState(currentGame?.state) ? (
              <TicTacToeTutorial />
            ) : null}
            <button
              type="button"
              onClick={handleCancelRequest}
              className="rounded-2xl bg-amber-500 px-3 py-3 text-xs font-black text-white shadow-lg shadow-ink/10"
            >
              درخواست لغو
            </button>
            <button
              type="button"
              onClick={() => setIsLeaveDialogOpen(true)}
              className="rounded-2xl bg-ember px-3 py-3 text-xs font-black text-white shadow-lg shadow-ink/10"
            >
              خروج از بازی
            </button>
          </div>
        </header>

        {ticTacToeState ? (
          <div className="space-y-4">
            {statusMessage ? (
              <p className="rounded-2xl bg-moss/10 px-3 py-2 text-sm font-bold text-moss">{statusMessage}</p>
            ) : null}

            {error ? <p className="rounded-2xl bg-ember/10 px-3 py-2 text-sm font-bold text-ember">{error}</p> : null}

            <div className="flex items-center justify-center gap-4 py-2">
              {ticTacToeState.players.slice(0, 2).map((player, index) => {
                const isCurrentTurn =
                  ticTacToeState.currentTurnUserId === player.userId &&
                  ticTacToeState.status === 'playing' &&
                  !ticTacToeState.roundTransitionAt &&
                  !ticTacToeState.matchTransitionAt;

                const isSelf = player.userId === user?.id;
                const roomPlayer = roomPlayersByUserId.get(player.userId);

                return (
                  <Fragment key={player.userId}>
                    <PlayerAvatarCard
                      userId={player.userId}
                      username={player.username}
                      fullName={roomPlayer?.fullName}
                      avatarUrl={player.avatarUrl}
                      isCurrentTurn={isCurrentTurn}
                      isSelf={isSelf}
                      isConnected={roomPlayer?.isConnected}
                      cancelRequested={roomPlayer?.cancelRequested}
                      disconnectedUntil={roomPlayer?.disconnectedUntil}
                      turnStartedAt={isCurrentTurn ? ticTacToeState.turnStartedAt : null}
                      turnDurationSeconds={ticTacToeState.turnDurationSeconds}
                      floatingMessage={floatingChatMessages[player.userId]?.message}
                      onClick={() =>
                        openProfile({
                          userId: player.userId,
                          username: player.username,
                          avatarUrl: player.avatarUrl
                        })
                      }
                    />

                    {index === 0 && ticTacToeState.players.length > 1 ? (
                      <span className="text-base font-black uppercase tracking-[0.18em] text-ink/50">
                        vs
                      </span>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>

            <div className="rounded-[1.5rem]  bg-white/80 p-3 shadow-lg shadow-ink/10">
              <TicTacToePhaserBoard state={ticTacToeState} currentUserId={user?.id ?? null} onCellClick={handleCellClick} />
            </div>

            <button
              type="button"
              onClick={handleRandomTicTacToeSelect}
              disabled={
                ticTacToeState.status !== 'playing' ||
                ticTacToeState.currentTurnUserId !== user?.id ||
                Boolean(ticTacToeState.roundTransitionAt) ||
                Boolean(ticTacToeState.matchTransitionAt)
              }
              className="w-full rounded-2xl bg-moss px-4 py-3 text-sm font-black text-white shadow-lg shadow-ink/10 transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-ink/20"
            >
              انتخاب خودکار تصادفی
            </button>
          </div>
        ) : imageGuessState ? (
          <div className="space-y-4">
            {error ? <p className="rounded-2xl bg-ember/10 px-3 py-2 text-sm font-bold text-ember">{error}</p> : null}

            <div className="flex items-center justify-center gap-4 py-2">
              {imageGuessState.players.slice(0, 2).map((player, index) => {
                const isCurrentTurn =
                  imageGuessState.currentTurnUserId === player.userId &&
                  imageGuessState.status === 'playing';

                const isSelf = player.userId === user?.id;
                const roomPlayer = roomPlayersByUserId.get(player.userId);

                return (
                  <Fragment key={player.userId}>
                    <PlayerAvatarCard
                      userId={player.userId}
                      username={player.username}
                      fullName={roomPlayer?.fullName}
                      avatarUrl={player.avatarUrl}
                      isCurrentTurn={isCurrentTurn}
                      isSelf={isSelf}
                      isConnected={roomPlayer?.isConnected}
                      cancelRequested={roomPlayer?.cancelRequested}
                      disconnectedUntil={roomPlayer?.disconnectedUntil}
                      turnStartedAt={isCurrentTurn ? imageGuessState.turnStartedAt : null}
                      turnDurationSeconds={imageGuessState.turnDurationSeconds}
                      floatingMessage={floatingChatMessages[player.userId]?.message}
                      onClick={() =>
                        openProfile({
                          userId: player.userId,
                          username: player.username,
                          avatarUrl: player.avatarUrl
                        })
                      }
                    />

                    {index === 0 && imageGuessState.players.length > 1 ? (
                      <span className="text-base font-black uppercase tracking-[0.18em] text-ink/50">
                        vs
                      </span>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>

            <div className="rounded-[1.5rem]  bg-white/80 p-3 shadow-lg shadow-ink/10">
              <ImageGuessBoard state={imageGuessState} currentUserId={user?.id ?? null} onItemSelect={handleImageGuessSelect} />
            </div>
          </div>
        ) : chessState ? (
          <div className="space-y-4">
            {error ? <p className="rounded-2xl bg-ember/10 px-3 py-2 text-sm font-bold text-ember">{error}</p> : null}

            <div className="flex items-center justify-center gap-4 py-2">
              {chessState.players.slice(0, 2).map((player, index) => {
                const isCurrentTurn = chessState.currentTurnUserId === player.userId && chessState.status === 'playing';
                const isSelf = player.userId === user?.id;
                const roomPlayer = roomPlayersByUserId.get(player.userId);

                return (
                  <Fragment key={player.userId}>
                    <PlayerAvatarCard
                      userId={player.userId}
                      username={player.username}
                      fullName={roomPlayer?.fullName}
                      avatarUrl={player.avatarUrl}
                      isCurrentTurn={isCurrentTurn}
                      isSelf={isSelf}
                      isConnected={roomPlayer?.isConnected}
                      cancelRequested={roomPlayer?.cancelRequested}
                      disconnectedUntil={roomPlayer?.disconnectedUntil}
                      turnStartedAt={isCurrentTurn ? chessState.turnStartedAt : null}
                      turnDurationSeconds={chessState.turnDurationSeconds}
                      floatingMessage={floatingChatMessages[player.userId]?.message}
                      onClick={() =>
                        openProfile({
                          userId: player.userId,
                          username: player.username,
                          avatarUrl: player.avatarUrl
                        })
                      }
                    />

                    {index === 0 && chessState.players.length > 1 ? (
                      <span className="text-base font-black uppercase tracking-[0.18em] text-ink/50">vs</span>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>

            {chessState.status === 'playing' ? (
              <div className="flex items-center justify-between rounded-2xl bg-ink/5 px-3 py-2">
                <p className="text-sm font-black text-ink/70">
                  {chessState.checkedColor ? `کیش برای ${chessState.checkedColor === 'white' ? 'سفید' : 'سیاه'}` : 'در حال بازی'}
                </p>
                <button
                  type="button"
                  onClick={handleRandomChessMove}
                  disabled={chessState.currentTurnUserId !== user?.id}
                  className="rounded-xl bg-moss px-3 py-2 text-xs font-black text-white shadow-lg shadow-ink/10 transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-ink/20"
                >
                  انتخاب خودکار تصادفی
                </button>
              </div>
            ) : (
              <p className="rounded-2xl bg-moss/10 px-3 py-2 text-sm font-bold text-moss">
                {chessState.matchWinnerUserId
                  ? `${chessState.players.find((p) => p.userId === chessState.matchWinnerUserId)?.username ?? 'بازیکن'} برنده شد.`
                  : 'بازی مساوی شد.'}
              </p>
            )}

            <ChessBoard state={chessState} currentUserId={user?.id ?? null} onMove={handleChessMove} />
          </div>
        ) : (
          <div className="rounded-[1.5rem]  bg-white/80 p-6 text-center font-black shadow-lg shadow-ink/10">
            <p>{room?.status === 'waiting' ? 'Game finished.' : 'Waiting for game state...'}</p>

            {room?.status === 'waiting' ? (
              <button
                type="button"
                onClick={() => navigate(`/rooms/${roomId}`, { replace: true })}
                className="mt-4 rounded-2xl bg-ink px-5 py-3 text-sm font-black text-white shadow-lg shadow-ink/10"
              >
                Back to lobby
              </button>
            ) : null}
          </div>
        )}

        <ChatPanel
          roomId={roomId}
          token={token}
          currentUserId={user?.id}
          title="Game chat"
          onNewMessage={handleFloatingChatMessage}
          onMicPointerDown={handleChatMicStart}
          onMicPointerUp={handleChatMicEnd}
          onMicPointerLeave={handleChatMicEnd}
          isMicActive={isChatMicActive}
        />

        <div className="hidden">
          {remoteStreams.map((item) => (
            <VoiceAudioRenderer key={item.userId} stream={item.stream} />
          ))}
        </div>
      </section>

      <ProfileBottomSheet
        isOpen={Boolean(selectedProfile)}
        userId={selectedProfile?.userId ?? null}
        onClose={() => setSelectedProfile(null)}
      />

      <Dialog
        open={isLeaveDialogOpen}
        onClose={() => setIsLeaveDialogOpen(false)}
        closeOnBackdropClick={false}
        avatarType={1}
        title='خروج از بازی'
      >
        <div className="space-y-4 text-center">
          <h2 className="font-display text-3xl font-black text-ember">خروج از بازی؟</h2>
          <p className="font-bold text-ink/70">
            اگر خارج شوید {LEAVE_GAME_XP_PENALTY} XP و {LEAVE_GAME_SCORE_PENALTY} امتیاز این بازی کم می‌شود.
            اگر موجودی کافی نداشته باشید، سرور اجازه خروج نمی‌دهد.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsLeaveDialogOpen(false)}
              className="rounded-2xl bg-ink/10 px-4 py-3 font-black text-ink"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleConfirmLeaveGame}
              disabled={isLeavingGame}
              className="rounded-2xl bg-ember px-4 py-3 font-black text-white"
            >
              {isLeavingGame ? 'در حال خروج...' : 'تایید خروج'}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
