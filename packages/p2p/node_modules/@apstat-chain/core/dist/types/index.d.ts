export interface PublicKey {
    readonly bytes: Uint8Array;
    readonly hex: string;
}
export interface PrivateKey {
    readonly bytes: Uint8Array;
    readonly hex: string;
}
export interface KeyPair {
    readonly publicKey: PublicKey;
    readonly privateKey: PrivateKey;
}
export interface Signature {
    readonly r: bigint;
    readonly s: bigint;
    readonly recovery?: number;
}
export interface Transaction {
    readonly id: string;
    readonly publicKey: string;
    readonly signature: string;
    readonly payload: any;
    readonly timestamp?: number;
}
export interface Attestation {
    readonly attesterPublicKey: string;
    readonly puzzleId: string;
    readonly attesterAnswer: string;
    readonly signature: string;
}
export interface AttestationTransaction {
    readonly type: 'attestation';
    readonly questionId: string;
    readonly answerHash?: string;
    readonly answerText?: string;
    readonly attesterPubKey: string;
    readonly signature: string;
    readonly timestamp: number;
}
export interface QuestionDistribution {
    readonly questionId: string;
    readonly totalAttestations: number;
    readonly mcqDistribution?: {
        readonly A: number;
        readonly B: number;
        readonly C: number;
        readonly D: number;
        readonly E?: number;
    };
    readonly frqDistribution?: {
        readonly scores: readonly number[];
        readonly averageScore: number;
        readonly standardDeviation: number;
    };
    readonly convergenceScore: number;
    readonly lastUpdated: number;
}
export interface BlockHeader {
    readonly previousHash: string;
    readonly merkleRoot: string;
    readonly timestamp: number;
    readonly blockHeight: number;
    readonly nonce: number;
}
export interface BlockBody {
    readonly transactions: readonly CompletionTransaction[];
    readonly attestations: readonly AttestationTransaction[];
    readonly quorumData: {
        readonly requiredQuorum: number;
        readonly achievedQuorum: number;
        readonly convergenceScore: number;
    };
}
export interface Block {
    readonly header: BlockHeader;
    readonly body: BlockBody;
    readonly signature: string;
    readonly producerPubKey: string;
    readonly blockId: string;
}
export interface LegacyBlock {
    readonly id: string;
    readonly previousHash: string;
    readonly transactions: readonly Transaction[];
    readonly timestamp: number;
    readonly signature: string;
    readonly publicKey: string;
    readonly puzzleId?: string;
    readonly proposedAnswer?: string;
    readonly attestations?: Attestation[];
}
export interface CompletionTransaction {
    readonly type: 'completion';
    readonly questionId: string;
    readonly userPubKey: string;
    readonly answerHash?: string;
    readonly answerText?: string;
    readonly signature: string;
    readonly timestamp: number;
}
//# sourceMappingURL=index.d.ts.map