import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@ccclass('Tools')
export class Tools extends Component {
    public async wait(ms: number) {
        await sleep(ms);
    }
}


