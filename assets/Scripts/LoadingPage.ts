import { _decorator, Component, Node } from 'cc';
import { Dictionary } from './Dictionary';
import { GuidePageManager } from './GuidePageManager';
import { sleep } from './Tools';
const { ccclass, property } = _decorator;

@ccclass('LoadingPage')
export class LoadingPage extends Component {
    @property(GuidePageManager)
    private guidePage:GuidePageManager = null;

    private static _instance:LoadingPage= null;
    
    protected onLoad(): void {
        LoadingPage._instance = this;
    }

    async start() {
        try {
            // 同步加载词典
            this.loadDictionary();
            // 异步加载关卡按钮（等待执行完成）
            await this.loadLevelButtons();
        } catch (error) {
            console.error('[资源加载] 初始化失败：', error);
        }
    }

    private loadDictionary(): void {
        //空值安全校验：防止单例未初始化导致崩溃
        if (!Dictionary.instance) {
            console.warn('[词典] 单例未初始化，跳过加载');
            return;
        }
        Dictionary.instance.LoadDict();
    }

    //异步初始化关卡按钮 
    private async loadLevelButtons(): Promise<void> {
        if (!this.guidePage) {
            console.warn('[引导页] 未绑定GuidePage节点');
            return;
        }
        try {
            // 显示引导页
            this.guidePage.node.active = true;
            // 标准异步延迟：替代无定义的sleep()
            await sleep(100);
            // 空值校验+等待异步初始化完成
            if (!GuidePageManager.instance) {
                throw new Error('GuidePageManager 单例未初始化');
            }
            await GuidePageManager.instance.initLevelButtons();
        } catch (error) {
            console.error('[关卡按钮] 初始化失败：', error);
        } finally {
            // finally保证：无论成功/失败，最终隐藏引导页（避免页面卡死）
            this.guidePage.node.active = false;
        }
    }

    public get instance(){return LoadingPage._instance}
}


