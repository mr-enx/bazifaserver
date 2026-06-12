import type { TicTacToeState } from '@game-platform/shared';
import Phaser from 'phaser';

type CellIntent = {
  row: number;
  col: number;
};

type TicTacToeSceneData = {
  state: TicTacToeState;
  currentUserId: string | null;
  onCellIntent: (intent: CellIntent) => void;
};

const SCENE_KEY = 'tic-tac-toe-scene';

const COLORS = {
  bg: 0xf8fafc,
  grid: 0x111827,
  x: 0x111827,
  o: 0xef4444,
  hover: 0x94a3b8,
  win: 0x22c55e
};

type MarkValue = 'X' | 'O';

export class TicTacToeScene extends Phaser.Scene {
  private currentState: TicTacToeState | null = null;
  private currentUserId: string | null = null;
  private onCellIntent: TicTacToeSceneData['onCellIntent'] = () => undefined;

  private cells: Phaser.GameObjects.Zone[] = [];
  private hover: Phaser.GameObjects.Graphics | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;

  private marks: (Phaser.GameObjects.Container | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];

  private winnerLine: Phaser.GameObjects.Graphics | null = null;
  private lastAnimatedMoveKey: string | null = null;

  // Dynamic dimensions
  private boardPadding = 0;
  private boardSize = 0;
  private cellSize = 0;

  constructor() {
    super(SCENE_KEY);
  }

  init(data: TicTacToeSceneData) {
    this.currentState = data.state;
    this.currentUserId = data.currentUserId;
    this.onCellIntent = data.onCellIntent;
  }

  create(data?: TicTacToeSceneData) {
    if (data) {
      this.currentState = data.state;
      this.currentUserId = data.currentUserId;
      this.onCellIntent = data.onCellIntent;
    }

    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.calculateDimensions();

    this.drawBoard();

    if (this.currentState) {
      this.renderState(this.currentState, this.currentUserId);
    }

    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
     const prevLastAnimatedMoveKey = this.lastAnimatedMoveKey;
     this.calculateDimensions();
     this.resetBoardGraphics();
     this.lastAnimatedMoveKey = prevLastAnimatedMoveKey;
     this.drawBoard();
     if (this.currentState) {
       this.renderState(this.currentState, this.currentUserId);
     }
   }

  private calculateDimensions() {
    const { width, height } = this.scale;
    const minDim = Math.min(width, height);
    
    this.boardPadding = minDim * 0.1;
    this.boardSize = minDim - this.boardPadding * 2;
    this.cellSize = this.boardSize / 3;
  }

  updateState(
    state: TicTacToeState,
    currentUserId: string | null,
    onCellIntent: TicTacToeSceneData['onCellIntent']
  ) {
    this.currentState = state;
    this.currentUserId = currentUserId;
    this.onCellIntent = onCellIntent;
    this.renderState(state, currentUserId);
  }

  private drawBoard() {
    this.gridGraphics?.destroy();
    this.cells.forEach(cell => cell.destroy());
    this.cells = [];

    const g = this.add.graphics();
    this.gridGraphics = g;

    const { width, height } = this.scale;
    const offsetX = (width - (this.boardSize + this.boardPadding * 2)) / 2;
    const offsetY = (height - (this.boardSize + this.boardPadding * 2)) / 2;

    g.lineStyle(Math.max(4, this.boardSize * 0.02), COLORS.grid, 0.92);

    for (let i = 1; i <= 2; i += 1) {
      const p = this.boardPadding + this.cellSize * i;

      // Vertical lines
      g.beginPath();
      g.moveTo(offsetX + p, offsetY + this.boardPadding);
      g.lineTo(offsetX + p, offsetY + this.boardPadding + this.boardSize);
      g.strokePath();

      // Horizontal lines
      g.beginPath();
      g.moveTo(offsetX + this.boardPadding, offsetY + p);
      g.lineTo(offsetX + this.boardPadding + this.boardSize, offsetY + p);
      g.strokePath();
    }

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const { x, y } = this.cellCenter(row, col);

        const zone = this.add
          .zone(x, y, this.cellSize, this.cellSize)
          .setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => this.showHover(row, col));
        zone.on('pointerout', () => this.hideHover());
        zone.on('pointerdown', () => this.handleCellClick(row, col));

        this.cells.push(zone);
      }
    }
  }

  private renderState(state: TicTacToeState, currentUserId: string | null) {
    this.hideHover();

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const value = state.board[row]?.[col] as MarkValue | undefined;
        const existingMark = this.marks[row][col];

        if ((value === 'X' || value === 'O') && !existingMark) {
          const isLastMove =
            state.lastMove?.row === row &&
            state.lastMove?.col === col &&
            this.lastAnimatedMoveKey !== this.moveKey(state.lastMove.row, state.lastMove.col);

          const mark = this.drawMark(row, col, value, isLastMove);
          this.marks[row][col] = mark;

          if (isLastMove && state.lastMove) {
            this.lastAnimatedMoveKey = this.moveKey(state.lastMove.row, state.lastMove.col);
          }
        }

        if (!value && existingMark) {
          existingMark.destroy();
          this.marks[row][col] = null;
        }

        const zone = this.cells[row * 3 + col];
        if (zone?.input) {
          zone.input.cursor = this.canPlayCell(state, currentUserId, row, col) ? 'pointer' : 'default';
        }
      }
    }

    const winner = this.getWinnerLine(state.board as MarkValue[][]);

    if (winner) {
      const winnerKey = winner.map((cell) => `${cell.row}-${cell.col}`).join('|');
      const existingWinnerKey = this.winnerLine?.getData('winnerKey') as string | undefined;

      if (!this.winnerLine || existingWinnerKey !== winnerKey) {
        this.winnerLine?.destroy();
        this.winnerLine = this.drawWinnerLine(winner);
        this.winnerLine.setData('winnerKey', winnerKey);
      }
    } else if (this.winnerLine) {
      this.winnerLine.destroy();
      this.winnerLine = null;
    }

    if (this.isBoardEmpty(state.board)) {
      this.resetBoardGraphics();
    }
  }

  private resetBoardGraphics() {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        this.marks[row][col]?.destroy();
        this.marks[row][col] = null;
      }
    }

    this.winnerLine?.destroy();
    this.winnerLine = null;
    this.lastAnimatedMoveKey = null;
    this.hideHover();
  }

  private isBoardEmpty(board: TicTacToeState['board']) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (board[row]?.[col]) {
          return false;
        }
      }
    }

    return true;
  }

  private moveKey(row: number, col: number) {
    return `${row}-${col}`;
  }

  private drawMark(row: number, col: number, value: MarkValue, animate: boolean) {
    const { x, y } = this.cellCenter(row, col);
    const size = this.cellSize * 0.28;
    const width = Math.max(4, this.cellSize * 0.08);

    const container = this.add.container(x, y);
    const g = this.add.graphics();

    g.lineStyle(width, value === 'X' ? COLORS.x : COLORS.o, 1);

    if (value === 'X') {
      g.beginPath();
      g.moveTo(-size, -size);
      g.lineTo(size, size);
      g.moveTo(size, -size);
      g.lineTo(-size, size);
      g.strokePath();
    } else {
      g.strokeCircle(0, 0, size);
    }

    container.add(g);

    if (animate) {
      container.setScale(0.2);
      container.setAlpha(0);

      this.tweens.add({
        targets: container,
        scale: 1,
        alpha: 1,
        duration: 260,
        ease: 'Back.Out'
      });
    }

    return container;
  }

  private drawWinnerLine(cells: CellIntent[]) {
    const first = this.cellCenter(cells[0].row, cells[0].col);
    const last = this.cellCenter(cells[2].row, cells[2].col);

    const g = this.add.graphics();
    const progress = { value: 0 };

    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 420,
      ease: 'Cubic.Out',
      onUpdate: () => {
        g.clear();
        g.lineStyle(Math.max(6, this.cellSize * 0.1), COLORS.win, 0.95);

        g.beginPath();
        g.moveTo(first.x, first.y);
        g.lineTo(
          first.x + (last.x - first.x) * progress.value,
          first.y + (last.y - first.y) * progress.value
        );
        g.strokePath();
      }
    });

    return g;
  }

  private showHover(row: number, col: number) {
    if (!this.currentState || !this.canPlayCell(this.currentState, this.currentUserId, row, col)) {
      return;
    }

    this.hideHover();

    const { x, y } = this.cellCenter(row, col);
    this.hover = this.add.graphics();
    this.hover.fillStyle(COLORS.hover, 0.13);
    this.hover.fillCircle(x, y, this.cellSize * 0.34);
  }

  private hideHover() {
    this.hover?.destroy();
    this.hover = null;
  }

  private handleCellClick(row: number, col: number) {
    if (!this.currentState || !this.canPlayCell(this.currentState, this.currentUserId, row, col)) {
      return;
    }

    this.onCellIntent({ row, col });
  }

  private getWinnerLine(board: MarkValue[][]): CellIntent[] | null {
    const lines: CellIntent[][] = [
      [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
      [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
      [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
      [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
      [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
      [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }],
      [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 0 }]
    ];

    return (
      lines.find(([a, b, c]) => {
        const first = board[a.row]?.[a.col];
        return first && first === board[b.row]?.[b.col] && first === board[c.row]?.[c.col];
      }) ?? null
    );
  }

  private canPlayCell(
    state: TicTacToeState,
    currentUserId: string | null,
    row: number,
    col: number
  ) {
    return (
      state.status === 'playing' &&
      !state.roundTransitionAt &&
      !state.matchTransitionAt &&
      state.currentTurnUserId === currentUserId &&
      !state.board[row]?.[col]
    );
  }

  private cellCenter(row: number, col: number) {
    const { width, height } = this.scale;
    const offsetX = (width - (this.boardSize + this.boardPadding * 2)) / 2;
    const offsetY = (height - (this.boardSize + this.boardPadding * 2)) / 2;

    return {
      x: offsetX + this.boardPadding + this.cellSize * col + this.cellSize / 2,
      y: offsetY + this.boardPadding + this.cellSize * row + this.cellSize / 2
    };
  }
}

export function createTicTacToePhaserConfig() {
  return {
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    scene: [TicTacToeScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      antialias: true
    }
  } satisfies Phaser.Types.Core.GameConfig;
}

export function syncTicTacToeScene(
  game: Phaser.Game,
  state: TicTacToeState,
  currentUserId: string | null,
  onCellIntent: TicTacToeSceneData['onCellIntent']
) {
  const scene = game.scene.getScene(SCENE_KEY);

  if (scene instanceof TicTacToeScene) {
    scene.updateState(state, currentUserId, onCellIntent);
    return;
  }

  game.scene.start(SCENE_KEY, {
    state,
    currentUserId,
    onCellIntent
  });
}
