import { _decorator, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
import { LetterTile } from './LetterTile';
import { UIManager } from '../UIManager';
import { BoardManager } from './BoardManager';
import { BaseBoardCell, BlankCellColor, CellState, HoverCellColor, OccupiedLetterlColor, RelatedCellColor } from '../BaseBoardCell'
import { BaseLetterTile } from '../BaseLetterTile';
const { ccclass, property } = _decorator;
@ccclass('BoardCell')
export class BoardCell extends BaseBoardCell {
    // 派生类唯一需要实现的方法
    public GetKeyBoardLetter(char: string): void {
        this._char = char;
        this.charLabel.string = char;
        BoardManager.instance.GetKeyBoardLetter({ row: this._row, col: this._col });
    }
}