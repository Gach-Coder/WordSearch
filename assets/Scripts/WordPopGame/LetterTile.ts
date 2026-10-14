import { _decorator } from 'cc';
import { BaseLetterTile } from '../BaseLetterTile';
const { ccclass } = _decorator;

@ccclass('LetterTile')
export class LetterTile extends BaseLetterTile {
    // 场景独有逻辑可在此扩展，无独有逻辑则保持空类即可
}