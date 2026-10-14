import { _decorator, Component, resources, JsonAsset, random} from 'cc';
const { ccclass, property } = _decorator;

export interface TwoDimDict {
    [word: string]: {          // 第一维：单词（字符串键）
        [partOfSpeech: string]: string  // 第二维：词性（字符串键）→ 释义（字符串值）
    };
}
export type WordPosToMeaning = TwoDimDict[string]; 

export const LETTER_FREQUENCY = {//字母出现频率*100
    'E': 12.02, 'T': 9.10, 'A': 8.12, 'O': 7.68, 'I': 7.31,
    'N': 6.95, 'S': 6.28, 'R': 6.02, 'H': 5.92, 'D': 4.32,
    'L': 3.98, 'C': 3.06, 'U': 2.88, 'M': 2.71, 'W': 2.11,
    'F': 2.09, 'G': 2.03, 'Y': 1.82, 'P': 1.49, 'B': 1.29,
    'V': 0.98, 'K': 0.77, 'J': 0.15, 'X': 0.15, 'Q': 0.09, 'Z': 0.07
};

export const LETTER_SCORE = {//频率的倒数
    'E': 8,  'T': 11, 'A': 12, 'O': 13, 'I': 14,
    'N': 15, 'S': 16, 'R': 17, 'H': 16, 'D': 24,
    'L': 25, 'C': 33, 'U': 36, 'M': 42, 'W': 47,
    'F': 48, 'G': 49, 'Y': 55, 'P': 67, 'B': 77,
    'V': 102, 'K': 130, 'J': 667, 'X': 667, 'Q': 1053, 'Z': 1351
};

export const EASY_LETTERS = 'ETAOINSRHDLCUMWFGYPBVK';
export const HARD_LETTERS = 'JXQZ';

enum LoadState{
    UNLOADED, // 未加载
    LOADING,  // 加载中
    LOADED,   // 加载完成
    FAILED    // 加载失败
}

@ccclass('Dictionary')
export class Dictionary extends Component {
    private globalDict: TwoDimDict = {};
    private _loadState: LoadState = LoadState.UNLOADED;
    public static instance: Dictionary = null;

    protected onLoad(): void {
        Dictionary.instance = this;
    }

    //进入首页过渡时LoadingPage.ts加载
    protected start(): void {
        this.LoadDict();
        
    }

    private LoadDictJson(jsonPath:string){
        if(this.isLoaded)return;
            this._loadState = LoadState.LOADING;
            let status;
            // 直接指定加载类型为 JsonAsset（完美匹配资源类型）
            resources.load<JsonAsset>(jsonPath, (err, jsonAsset) => {
                if (err) {
                    status = `❌ 加载失败：${err.message}`;
                    console.error("加载失败详情：", err);
                    this._loadState = LoadState.FAILED;
                    return;
                }
    
                try {
                    // 关键：直接获取解析后的对象（JsonAsset 自带 json 属性）
                    this.globalDict = jsonAsset.json as TwoDimDict;
    
                    // 验证解析结果
                    if (typeof this.globalDict !== "object" || this.globalDict === null) {
                        this._loadState = LoadState.FAILED;
                        throw new Error("解析结果不是有效词典");
                    }
    
                    const wordCount = Object.keys(this.globalDict)?.length;
                    status = `✅ 词典json文件加载成功！共 ${wordCount} 个单词`;
                    this._loadState = LoadState.LOADED;
    
                    // 示例：遍历任意单词的第二维（如 "conduct"）
                    //this.traverseWord("conduct");
                } catch (parseErr) {
                    status = `❌ 解析失败：${parseErr.message}`;
                    this._loadState = LoadState.FAILED;
                    console.error("解析失败详情：", parseErr);
                }
            });
    }

    public LoadDict(){
        this.LoadDictJson("Dictionary");
    }

    public get isLoaded():boolean{
        return this._loadState === LoadState.LOADED;
    }

    // 单词合法性检查 //忽略大小写
    public isValidWord(word: string): boolean {
        if(!this.isLoaded){
            this.LoadDictJson("Dictionary");
        }

        word = word.toLowerCase();
        const WORD = word.toUpperCase();
        const Word = word.charAt(0).toUpperCase() + word.slice(1);
        const wordlist = [WORD,word,Word];

        for(let i = 0 ; i < wordlist?.length ; i ++){
            if(this.globalDict.hasOwnProperty(wordlist[i])){
                return true;
            }
        }
        return false;
    }

    //重复isValidWord流程,得到大小写正确的形式
    public getValidCase(word:string):string{
        if(!this.isLoaded){
            this.LoadDictJson("Dictionary");
        }

        if(this.globalDict.hasOwnProperty(word)){
            return word;
        }

        word = word.toLowerCase();
        const WORD = word.toUpperCase();
        const Word = word.charAt(0).toUpperCase() + word.slice(1);
        const wordlist = [WORD,word,Word];

        for(let i = 0 ; i < wordlist?.length ; i ++){
            if(this.globalDict.hasOwnProperty(wordlist[i]))
                return wordlist[i];
        }
        return null;
    }

    public GetFirstCharUpperCase(word:string){
        if(this.isValidWord(word)){
            word = this.getValidCase(word);
        }
        else {
            word = word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    public GetMeanings(word:string):WordPosToMeaning{
        const ValidWord = this.getValidCase(word);
        return this.globalDict[ValidWord];
    }

    public GetMeaningsString(word:string):string{
        let result = '';
        const posMeanings:WordPosToMeaning = this.GetMeanings(word);
        const keys = Object.keys(posMeanings).slice(0, 4);
        for (const pos of keys) {
            const meaning = posMeanings[pos];
            result += `${pos} ${meaning}\n`;
        }
        return result.length>0?result.slice(0, -1):''; 
    }

    public randomLetterByFreq(): string {
        let sum=0;
        const clist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        clist.split('').forEach(char => {
            sum += LETTER_FREQUENCY[char];
        });
        let rd = Math.random()*sum;
        for(let i = 0 ; i < 26 ; i ++){
            const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i];
            if (rd < LETTER_FREQUENCY[c]){
                return c;
            }
            else{
                rd -= LETTER_FREQUENCY[c];
            }
        }
        return 'e';
    }

    public randomLetterEquelFreq():string{
        return String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }

    public charRank2Letter(char_rank : number) : string{
        if(char_rank<0||char_rank>25)return;//非法字母
        return String.fromCharCode('A'.charCodeAt(0) + char_rank);
    }

    public Letter2charRank(char : string) : number{
        if (char?.length>1){
            console.error("Got a string");
            return;
        }
        if ('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(char)< 0 ) {
            console.error("Not a letter");
            return;
        }
        return char.charCodeAt(0)-'A'.charCodeAt(0);
    }

    public RandomWord():string{
        const keys = Object.keys(this.globalDict);
        return keys[Math.floor(Math.random() * keys.length)];
    }

    public RandomVowel():string{
        return 'aeiou'[Math.floor(Math.random() * 5)];
    }

    public GivaAWordByPre(pre:string,allowSame:boolean):string{
        const keys = Object.keys(this.globalDict).sort(() => Math.random() - 0.5);
        for (const word of Object.values(keys) as string[]) {
            if (word.toUpperCase().startsWith(pre.toUpperCase())) {
                if(allowSame||word.length!=pre.length){
                    return word;
                }
            }
        }
        return '';
    }
}


