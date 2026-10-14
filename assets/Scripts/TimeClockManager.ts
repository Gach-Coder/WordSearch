import { _decorator, Component, Node,Label } from 'cc';
const { ccclass, property } = _decorator;

export enum timerCountType{
    countDown,
    countUp
}

@ccclass('TimeClockManager')
export class TimeClockManager extends Component {
    public static instance = null;

    private timerLabel:Label = null;

    private countType:timerCountType = null;
    // 当前计时（秒，保留2位小数）
    private currentTime: number = 0;
    private totalTime : number = 0;

    // 计时状态
    private isRunning: boolean = false; // 是否运行中
    private isPaused: boolean = false;  // 是否暂停

    // 结束回调（可自定义）
    private onTimerEnd?: () => void;

    protected onLoad(): void {
        TimeClockManager.instance = this;
    }

    // 帧更新：核心计时逻辑（deltaTime为每帧耗时，秒）
    update(deltaTime: number) {
        if (!this.isRunning || this.isPaused) return;

        // 正计时：累加时间
        if (this.countType === timerCountType.countUp) {
            this.currentTime += deltaTime;
        }
        // 倒计时：递减时间
        else if (this.countType === timerCountType.countDown) {
            this.currentTime -= deltaTime;
            // 倒计时结束
            if (this.currentTime <= 0) {
                this.currentTime = 0;
                this.stopTimer();
                this.onTimerEnd?.(); // 执行结束回调
            }
        }

        // 更新UI显示（保留2位小数，格式化为 00:00 或 0.00）
        if (this.timerLabel) {
            this.timerLabel.string = this.formatTime(this.currentTime);
        }
    }

    // 格式化时间：秒 → 00:00（分:秒） 或 保留2位小数
    public formatTime(seconds: number): string {
        // 方案1：分秒格式（如 01:23）
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // 方案2：保留2位小数（如 3.14）
        // return seconds.toFixed(2);
    }

    // ========== 对外调用方法 ==========
    // 启动计时
    startTimer(callBack?: () => void) {
        this.isRunning = true;
        this.isPaused = false;
        this.onTimerEnd = callBack; // 绑定结束回调
    }

    // 暂停计时
    pauseTimer() {
        this.isPaused = true;
    }

    // 恢复计时
    resumeTimer() {
        this.isPaused = false;
    }

    // 停止计时
    stopTimer() {
        this.isRunning = false;
    }

    // 重置计时（恢复初始状态）
    resetTimer(timerLabel:Label,timerType:timerCountType,totalTime:number = null) {
        this.timerLabel = timerLabel;
        this.isRunning = false;
        this.isPaused = false;
        this.countType = timerType;
        this.totalTime = totalTime;
        // 倒计时：重置为总时长；正计时：重置为0
        if(timerType === timerCountType.countUp){
            this.currentTime = 0;
        }else{
            this.currentTime = totalTime;
            if(!totalTime){
                console.error("Got no countdown number");
            }
        }
        // 更新UI
        if (this.timerLabel) {
            this.timerLabel.string = this.formatTime(this.currentTime);
        }
    }

    addTimer(add:number){
        const addTo = this.currentTime + add;
        this.currentTime = addTo < this.totalTime ? addTo : this.totalTime;
        if(this.currentTime < 0) this.currentTime = 0;
    }

    // 获取当前计时（秒）
    getCurrentTime(): number {
        return parseFloat(this.currentTime.toFixed(2));
    }

    isWorking():boolean{
        return this.isRunning&&!this.isPaused;
    }

    onDestroy() {
        // 销毁时停止计时（避免内存泄漏）
        this.stopTimer();
        this.onTimerEnd = undefined;
    }

    //倒计时小于某时间
    isCountDownSoon(rate:number){
        return this.countType == timerCountType.countDown && this.currentTime <= this.totalTime*rate;
    }
}


