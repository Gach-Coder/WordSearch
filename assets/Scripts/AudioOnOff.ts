import { _decorator, Button, Component, Node, Sprite, SpriteFrame } from 'cc';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

@ccclass('AudioOnOff')
export class AudioOnOff extends Component {
    @property(SpriteFrame)
    private ButtonOnPNG:SpriteFrame = null;
    @property(SpriteFrame)
    private ButtonOffPNG:SpriteFrame = null;

    protected onLoad(): void {
        this.node.on(Button.EventType.CLICK,this.Press, this);
    }

    protected start(): void {
        this.UpdateState();
    }

    public UpdateState(){
        if(AudioManager.instance.isAudioOn)this.node.getComponent(Sprite).spriteFrame = this.ButtonOnPNG;
        else this.node.getComponent(Sprite).spriteFrame = this.ButtonOffPNG;
    }

    private Press(){
        AudioManager.instance.AudioSwitch();
        this.UpdateState();
    }

    protected onDestroy(): void {
        this.node?.targetOff(this);
    }
}


