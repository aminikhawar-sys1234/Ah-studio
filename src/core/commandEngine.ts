// AH Studio Core — Command Engine with Undo/Redo
// All editor mutations go through commands for full reversibility

import { eventBus } from './eventBus';
import type { ID } from './types';

export interface Command {
  id: ID;
  type: string;
  description: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

export class CommandEngine {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize = 100;

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    eventBus.emit('onCommandExecute', { commandId: command.id, type: command.type });
  }

  undo(): Command | undefined {
    const command = this.undoStack.pop();
    if (!command) return undefined;
    command.undo();
    this.redoStack.push(command);
    eventBus.emit('onCommandUndo', { commandId: command.id });
    return command;
  }

  redo(): Command | undefined {
    const command = this.redoStack.pop();
    if (!command) return undefined;
    command.redo();
    this.undoStack.push(command);
    eventBus.emit('onCommandRedo', { commandId: command.id });
    return command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getHistory(): Command[] {
    return [...this.undoStack];
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const commandEngine = new CommandEngine();
