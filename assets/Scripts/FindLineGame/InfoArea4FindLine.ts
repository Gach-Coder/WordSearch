import { _decorator, Component, Node,Button,Label} from 'cc';
import { PlayerData } from '../PlayerData';
import { TimeClockManager } from '../TimeClockManager';
const { ccclass, property } = _decorator;

@ccclass('InfoArea4FindLine')
export class InfoArea4FindLine extends Component {
    @property(Node)
    private NEWIcon : Node = null;

    @property(Label)
    private resultLabel:Label = null!;
    @property(Label)
    private recordLabel:Label = null!;
    
    protected start(): void {
        //this.node.active = false;
        //this.NEWIcon.active = false;
    }

    public OpenWindowWithResult(params: Record<string, any>){
        this.node.active = true;
        this.UpdateLabels(params);
    }

    private UpdateLabels(params: Record<string, any>){
        const result = params.result;
        const record = PlayerData.instance.Get_FLG_TimeCostHistory(params.dif,params.level);
        if(record>=result){
            //New record
            this.resultLabel.string = TimeClockManager.instance.formatTime(result);
            this.recordLabel.string = TimeClockManager.instance.formatTime(record);
            this.NEWIcon.active = true;
        }
        else{
            //normal result
            this.resultLabel.string = TimeClockManager.instance.formatTime(result);
            this.recordLabel.string = TimeClockManager.instance.formatTime(record);
            this.NEWIcon.active = false;
        }
    }

    protected onDestroy(): void {
    }
}


