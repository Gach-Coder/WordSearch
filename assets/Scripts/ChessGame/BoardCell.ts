import { _decorator, Component, Node } from 'cc';
import { BaseBoardCell } from '../BaseBoardCell';
import { BoardManager } from './BoardManager';
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


