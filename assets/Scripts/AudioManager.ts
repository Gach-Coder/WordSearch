import { _decorator, Component, Node,AudioSource, AudioClip} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    public static instance : AudioManager = null!;

    private BGMActive : boolean = null;
    private AudioActive : boolean = null;

    @property(AudioSource)
    private SFXPlayer: AudioSource = null!;
    @property(AudioSource)
    private BGMPlayer: AudioSource = null!;

    @property(AudioClip)
    private SingleSuccessClip: AudioClip = null!;
    @property(AudioClip)
    private SingleFailureClip: AudioClip = null!;

    protected onLoad(): void {
        AudioManager.instance = this;
    }

    protected start(): void {
        this.init()
    }

    private init(){
        this.BGMActive = true;
        this.AudioActive = true;
    }

    public SingleSuccess(){
        if(this.AudioActive)
            this.SFXPlayer.playOneShot(this.SingleSuccessClip,0.15);
    }

    public SingleFailure(){
        if(this.AudioActive)
            this.SFXPlayer.playOneShot(this.SingleFailureClip,1);
    }

    public BGMSwitch(){
        this.BGMActive = this.BGMActive?false:true;
        if(this.BGMActive){
            this.BGMPlayer.play();
        }
        else{
            this.BGMPlayer.pause();
        }
    }

    public AudioSwitch(){
        this.AudioActive = this.AudioActive?false:true;
    }

    public get isBGMOn():boolean{
        return this.BGMActive;
    }

    public get isAudioOn():boolean{
        return this.AudioActive;
    }
}


