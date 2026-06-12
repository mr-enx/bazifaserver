import type { ChessColor, ChessPiece, ChessSquare, ChessState } from '@game-platform/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BOARD_BACKGROUND_SVG, getPieceAlt, PIECE_SVGS } from './chess-assets';
import { findKingSquare, getLegalMovesForPiece } from './chess-rules';
import { MOVE_ANIMATION_MS, type AnimatedMove } from './chess-types';
import { getUserColor, isSameSquare, toKey, transformSquareForView, untransformSquareForView } from './chess-utils';

type ChessBoardProps = {
  state: ChessState;
  currentUserId: string | null;
  onMove: (from: ChessSquare, to: ChessSquare) => void;
};

export function ChessBoard({ state, currentUserId, onMove }: ChessBoardProps) {
  const myColor = getUserColor(state, currentUserId);
  const viewColor: ChessColor = myColor ?? 'white';
  const isMyTurn = Boolean(currentUserId && state.currentTurnUserId === currentUserId && state.status === 'playing');

  const [selected, setSelected] = useState<ChessSquare | null>(null);
  const [animatedMove, setAnimatedMove] = useState<AnimatedMove | null>(null);
  const [animateActive, setAnimateActive] = useState(false);

  const previousLastMoveKeyRef = useRef<string | null>(null);

  const lastMoveFrom = state.lastMove?.from ?? null;
  const lastMoveTo = state.lastMove?.to ?? null;

  const checkedKingSquare = useMemo(() => {
    if (!state.checkedColor) {
      return null;
    }

    return findKingSquare(state.board, state.checkedColor);
  }, [state.board, state.checkedColor]);

  const legalMoves = useMemo(() => {
    if (!selected || !myColor || !isMyTurn) {
      return [];
    }

    return getLegalMovesForPiece(state.board, myColor, selected);
  }, [state.board, selected, myColor, isMyTurn]);

  const legalMoveKeys = useMemo(() => new Set(legalMoves.map(toKey)), [legalMoves]);

  useEffect(() => {
    const from = state.lastMove?.from ?? null;
    const to = state.lastMove?.to ?? null;

    if (!from || !to) {
      return;
    }

    const moveKey = `${from.row}:${from.col}-${to.row}:${to.col}`;

    if (previousLastMoveKeyRef.current === moveKey) {
      return;
    }

    previousLastMoveKeyRef.current = moveKey;

    const pieceAtTo = state.board[to.row]?.[to.col] ?? null;

    if (!pieceAtTo) {
      return;
    }

    setAnimateActive(false);

    setAnimatedMove({
      key: moveKey,
      piece: pieceAtTo,
      from: transformSquareForView(from, viewColor),
      to: transformSquareForView(to, viewColor)
    });

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimateActive(true);
      });
    });

    const timeout = window.setTimeout(() => {
      setAnimatedMove(null);
      setAnimateActive(false);
    }, MOVE_ANIMATION_MS + 40);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [state.lastMove, state.board, viewColor]);

  function handleSquareClick(rawSquare: ChessSquare) {
    if (!isMyTurn || !myColor) {
      setSelected(null);
      return;
    }

    const square = untransformSquareForView(rawSquare, viewColor);
    const piece = state.board[square.row]?.[square.col] ?? null;

    if (!selected) {
      if (piece && piece.color === myColor) {
        setSelected(square);
      }
      return;
    }

    if (isSameSquare(selected, square)) {
      setSelected(null);
      return;
    }

    if (piece && piece.color === myColor) {
      setSelected(square);
      return;
    }

    if (legalMoveKeys.has(toKey(square))) {
      onMove(selected, square);
      setSelected(null);
    }
  }

  const displaySquares = useMemo(() => {
    const squares: Array<{
      square: ChessSquare;
      piece: ChessPiece | null;
    }> = [];

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const boardSquare = untransformSquareForView({ row, col }, viewColor);

        squares.push({
          square: { row, col },
          piece: state.board[boardSquare.row]![boardSquare.col]
        });
      }
    }

    return squares;
  }, [state.board, viewColor]);

  const selectedDisplay = selected ? transformSquareForView(selected, viewColor) : null;
  const lastFromDisplay = lastMoveFrom ? transformSquareForView(lastMoveFrom, viewColor) : null;
  const lastToDisplay = lastMoveTo ? transformSquareForView(lastMoveTo, viewColor) : null;
  const checkedKingDisplay = checkedKingSquare ? transformSquareForView(checkedKingSquare, viewColor) : null;

  const animatedStyle = useMemo(() => {
    if (!animatedMove) {
      return undefined;
    }

    const dx = (animatedMove.to.col - animatedMove.from.col) * 100;
    const dy = (animatedMove.to.row - animatedMove.from.row) * 100;

    return {
      transform: animateActive ? `translate(${dx}%, ${dy}%)` : 'translate(0%, 0%)',
      transition: `transform ${MOVE_ANIMATION_MS}ms ease-in-out`
    };
  }, [animatedMove, animateActive]);

  return (
    <div className="mx-auto w-full max-w-[460px] select-none overflow-hidden rounded-[1.5rem]  bg-white/80 p-2 shadow-lg shadow-ink/10">
      <div
        className="relative grid grid-cols-8 gap-0 overflow-hidden rounded-[1.25rem]"
        style={{
          backgroundImage: `url(${BOARD_BACKGROUND_SVG})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {displaySquares.map(({ square, piece }) => {
          const displaySquare = square;
          const originalSquare = untransformSquareForView(displaySquare, viewColor);

          const isSelected = isSameSquare(selectedDisplay, displaySquare);
          const isLastFrom = isSameSquare(lastFromDisplay, displaySquare);
          const isLastTo = isSameSquare(lastToDisplay, displaySquare);
          const isCheckedKing = isSameSquare(checkedKingDisplay, displaySquare);
          const isLegalMove = legalMoveKeys.has(toKey(originalSquare));

          const isAnimatedDestination = Boolean(animatedMove && isSameSquare(animatedMove.to, displaySquare));

          const highlight = isSelected
            ? 'ring-4 ring-amber-500/70'
            : isCheckedKing
              ? 'ring-4 ring-red-500/70'
              : isLegalMove
                ? 'ring-4 ring-sky-500/80'
                : isLastFrom || isLastTo
                  ? 'ring-4 ring-moss/40'
                  : 'ring-1 ring-transparent';

          const cursor = isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed';

          return (
            <button
              key={toKey(displaySquare)}
              type="button"
              onClick={() => handleSquareClick(displaySquare)}
              disabled={!isMyTurn}
              className={`relative flex aspect-square items-center justify-center bg-transparent ${highlight} ${cursor} transition`}
            >
              {piece && !isAnimatedDestination ? (
                <img
                  src={PIECE_SVGS[piece.color][piece.type]}
                  alt={getPieceAlt(piece)}
                  draggable={false}
                  className="pointer-events-none z-10 h-[78%] w-[78%] object-contain drop-shadow-sm"
                />
              ) : null}

              {isLegalMove && !piece ? (
                <span className="pointer-events-none absolute h-4 w-4 rounded-full bg-sky-500/80" />
              ) : null}

              {isLegalMove && piece ? (
                <span className="pointer-events-none absolute inset-1 rounded-full border-4 border-sky-500/80" />
              ) : null}
            </button>
          );
        })}

        {animatedMove ? (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: `${animatedMove.from.col * 12.5}%`,
              top: `${animatedMove.from.row * 12.5}%`,
              width: '12.5%',
              height: '12.5%'
            }}
          >
            <div className="flex h-full w-full items-center justify-center" style={animatedStyle}>
              <img
                src={PIECE_SVGS[animatedMove.piece.color][animatedMove.piece.type]}
                alt={getPieceAlt(animatedMove.piece)}
                draggable={false}
                className="h-[78%] w-[78%] object-contain drop-shadow-md"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
