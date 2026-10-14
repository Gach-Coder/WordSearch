import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export enum MyGameEvent{//setting窗口打开，通知游戏暂停
    TEMPWINDOW_ON = 'temp_window_on',
    TEMPWINDOW_OFF = 'temp_window_off',
    GO_BACK = 'go_back',
    NEXT_GAME = 'next_game',
    RESET_GAME= 'reset_game',
    ENTER_GAME= 'enter_game',
    PAUSE_GAME= 'pause_game',
    RESUME_GAME= 'resume_game'
}


@ccclass('EventManager')
export class EventManager extends Component {
    @property(Node)
    private EmitNode:Node = null!;
    public get emitNode():Node{return this.EmitNode}

    private static _instance: EventManager = null;
    public static get instance():EventManager {return this._instance}

    protected onLoad(): void {
        EventManager._instance = this;
        if(!this.EmitNode){
            this.EmitNode = this.node;
        }
    }

    public on(eventName: string, callback: Function, target?: any): void {
        // 使用 Cocos 的事件系统
        this.EmitNode?.off(eventName, callback, target);
        this.EmitNode?.on(eventName, callback, target);
    }

    /**
     * 移除事件监听
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param target 目标对象
     */
    public off(eventName: string, callback: Function, target?: any): void {
        this.EmitNode?.off(eventName, callback, target);
    }

    /**
     * 发送事件
     * @param eventName 事件名称
     * @param args 参数
     */
    public emit(eventName: string, ...args: any[]): void {
        this.EmitNode?.emit(eventName, ...args);
    }
}


