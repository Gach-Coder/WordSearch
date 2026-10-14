import { _decorator, Component, Node, randomRangeInt } from 'cc';
import { GameType, MaxLevel } from './GameDatabase';
const { ccclass, property } = _decorator;

@ccclass('PlayerData')
export class PlayerData extends Component {
    private FindLineGameLevel : number[] = null;
    private tipChanceInFLG : number = 3;
    private FLG_record : number[][] = null;

    private WordPopGameLevel:number[] = null;
    private WordPopGameScore: number = null;

    public ChessGameLevel:number[] = null;

    //unimportant data
    public BGMActive : boolean = true;
    public AudioActive : boolean = true;

    public static instance: PlayerData = null;
    public active: boolean = null;

    public Dif_unlock : Partial<Record<GameType, boolean>> = null;

    protected onLoad(): void {
        PlayerData.instance = this;
    }

    protected start(): void {
        this.ReadPlayerData();
    }

    public get FLG_lv():number[]{
        return this.FindLineGameLevel;
    }

    public get FLG_tip():number{
        return this.tipChanceInFLG;
    }

    public FLG_LevelUp(dif:number){
        this.FindLineGameLevel[dif] ++;
        if(this.FindLineGameLevel[dif]>=200)this.FindLineGameLevel[dif] = 200;
        this.UpdateData();
    }

    public FLG_TipChanceAdd(count:number = 3){
        this.tipChanceInFLG += count;
    }

    private UpdateData(){

    }

    private ReadPlayerData(){
        //Settings
        this.tipChanceInFLG = 3;
        this.BGMActive = true;
        this.AudioActive = true;

        //FLG
        this.FindLineGameLevel = [45,50,200];//最大解锁关卡
        this.Dif_unlock = {
            [GameType.FINDLINE]: true,    // 连连看 解锁
            [GameType.CHESS]: true,       // 自走棋 解锁
            [GameType.WORDPOP]: true      // 消消乐 解锁
        };

        this.FLG_record = Array(3).fill(0).map(() => Array(200).fill(0).map(() => Math.floor(Math.random() * 120)+48));
        for (let i = 0; i < 3; i++) { // 遍历第一维（3行）
            for (let j = this.FindLineGameLevel[i]; j <= MaxLevel[i]; j++) { // 遍历第二维（200列）
                this.FLG_record[i][j-1] = -1;
            }
        }

        //WordPop
        this.WordPopGameLevel = [1,1,1];
        this.WordPopGameScore = 100;

        //ChessGame
        this.ChessGameLevel = [1,1,1];

        this.active = true;//读取成功
    }

    public GetGameLevels(game:GameType):number[]{
        if(game===GameType.FINDLINE)
            return this.FindLineGameLevel;
        if(game === GameType.CHESS)
            return this.ChessGameLevel;
        if(game === GameType.WORDPOP)
            return this.WordPopGameLevel;
    }

    public ChessGameLevelUp(dif:number){
        this.ChessGameLevel[dif]++;
    }

    public WordPopLevelUp(dif:number){
        this.ChessGameLevel[dif]++;
    }

    public get WordPopScore(){
        return this.WordPopGameScore;
    }

    public WordPopNewRecord(score:number){
        if(this.WordPopGameScore < score)
            this.WordPopGameScore = score;
    }

    public Get_FLG_TimeCostHistory(dif:number,level:number){
        if(this.FLG_record[dif][level-1]>0)
            return this.FLG_record[dif][level-1];
        else
            return null;
    }

    public FLG_NewRecord(dif:number,level:number,result:number){
        if(this.FLG_record[dif][level-1]<0){
            this.FLG_record[dif][level-1] = result;
        }
        else{//result vs record
            if(this.FLG_record[dif][level-1]<result){
            }
            else{//new record
                this.FLG_record[dif][level-1] = result;
            }
        }
    }
}


