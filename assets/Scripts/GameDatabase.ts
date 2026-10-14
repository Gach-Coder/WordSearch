export enum GameType {
    FINDLINE = '连连看',
    WORDCHAIN = '单词接龙',
    CHESS = '自走棋',
    WORDPOP = '消消乐'
}

type MaxLevelMap = Partial<Record<GameType, number[]>>;

export const MaxLevel:MaxLevelMap = {
    [GameType.FINDLINE] :   [200,200,200],
    [GameType.CHESS]    :   [10,10,10],
    [GameType.WORDPOP]  :   [100,100,100]
}
