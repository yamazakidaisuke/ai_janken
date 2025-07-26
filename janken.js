/**
 * AIジェスチャーじゃんけんゲーム
 * Teachable Machineを使用したリアルタイム手の形認識
 */

// 設定値 
const CONFIG = {
    MODEL_URL: "./my_model/",
    COOLDOWN_SECONDS: 3,
    CONFIDENCE_THRESHOLD: 0.95,
    WEBCAM_SIZE: 300
};

// 手の種類と絵文字のマッピング
const HAND_EMOJIS = {
    'Gu': '✊',
    'Choki': '✌️', 
    'Pa': '✋'
};

// ゲーム状態管理
class JankenGame {
    constructor() {
        this.model = null;
        this.webcam = null;
        this.maxPredictions = 0;
        this.isGameActive = false;
        this.elements = {};
    }

    // ページロード時の初期化
    async init() {
        this.initElements();
        await this.setupCamera();
        this.startGameLoop();
    }

    // DOM要素の取得
    initElements() {
        this.elements = {
            status: document.getElementById('status'),
            playerHand: document.getElementById('player-hand'),
            computerHand: document.getElementById('computer-hand'),
            resultText: document.getElementById('result-text'),
            webcamContainer: document.getElementById('webcam-container'),
            labelContainer: document.getElementById('label-container')
        };
    }

    // カメラとモデルのセットアップ
    async setupCamera() {
        // tmImageがロードされるまで待機
        await new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (typeof tmImage !== 'undefined') {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(interval);
                reject(new Error("tmImage library is not loaded"));
            }, 10000); // 最大10秒待機
        });

        this.elements.status.innerText = "カメラを準備中...";
        
        try {
            // モデルの読み込み
            const modelURL = CONFIG.MODEL_URL + "model.json";
            const metadataURL = CONFIG.MODEL_URL + "metadata.json";
            console.log(modelURL);
            console.log(metadataURL);
            this.model = await tmImage.load(modelURL, metadataURL);
            this.maxPredictions = this.model.getTotalClasses();

            // ウェブカメラのセットアップ
            this.webcam = new tmImage.Webcam(CONFIG.WEBCAM_SIZE, CONFIG.WEBCAM_SIZE, true);
            await this.webcam.setup();
            
            if (!this.webcam.canvas) {
                throw new Error("Webcam setup failed");
            }

            await this.webcam.play();
            
            // UIにカメラを追加
            this.elements.webcamContainer.appendChild(this.webcam.canvas);
            
            // デバッグ用ラベルコンテナの初期化
            for (let i = 0; i < this.maxPredictions; i++) {
                this.elements.labelContainer.appendChild(document.createElement("div"));
            }
            
            this.elements.status.innerText = "カメラに向かって手を出してください！";
            this.isGameActive = true;
            
        } catch (error) {
            console.error("Setup error:", error);
            this.elements.status.innerText = "エラーが発生しました。カメラを許可してください。";
        }
    }

    // ゲームループの開始
    startGameLoop() {
        const loop = async () => {
            if (this.webcam) {
                this.webcam.update();
                if (this.isGameActive) {
                    await this.predict();
                }
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    // 手の形を予測
    async predict() {
        const prediction = await this.model.predict(this.webcam.canvas);
        
        // 最も確率の高いクラスを取得
        const bestPrediction = prediction.reduce((prev, current) => 
            current.probability > prev.probability ? current : prev
        );
        
        // 確率がしきい値を超えたらゲーム開始
        if (bestPrediction.probability > CONFIG.CONFIDENCE_THRESHOLD) {
            this.isGameActive = false;
            this.playJanken(bestPrediction.className);
        }
    }

    // じゃんけんの実行
    playJanken(playerHandName) {
        // コンピューターの手をランダムに決定
        const hands = ['Gu', 'Choki', 'Pa'];
        const computerHandName = hands[Math.floor(Math.random() * hands.length)];

        // 勝敗判定
        const result = this.judge(playerHandName, computerHandName);

        // UI更新
        this.updateUI(playerHandName, computerHandName, result);
        
        // ゲームリセット
        setTimeout(() => this.resetGame(), CONFIG.COOLDOWN_SECONDS * 1000);
    }

    // 勝敗判定
    judge(player, computer) {
        if (player === computer) return "draw";
        
        const winConditions = {
            'Gu': 'Choki',
            'Choki': 'Pa', 
            'Pa': 'Gu'
        };
        
        return winConditions[player] === computer ? "win" : "lose";
    }

    // UI更新
    updateUI(player, computer, result) {
        // 手を絵文字で表示
        this.elements.playerHand.innerText = HAND_EMOJIS[player] || '👤';
        this.elements.computerHand.innerText = HAND_EMOJIS[computer] || '💻';

        // スタイルリセット
        this.elements.playerHand.className = 'hand';
        this.elements.computerHand.className = 'hand';

        // 結果に応じてUI更新
        const resultConfig = {
            'win': {
                text: "あなたの勝ち！",
                className: 'result-text win-text',
                winner: this.elements.playerHand
            },
            'lose': {
                text: "あなたの負け...",
                className: 'result-text lose-text',
                winner: this.elements.computerHand
            },
            'draw': {
                text: "あいこでしょ！",
                className: 'result-text draw-text',
                winner: null
            }
        };

        const config = resultConfig[result];
        this.elements.resultText.innerText = config.text;
        this.elements.resultText.className = config.className;
        
        if (config.winner) {
            config.winner.classList.add('win');
        }
    }

    // ゲームリセット
    resetGame() {
        this.elements.status.innerText = "次の手を出してください！";
        this.elements.playerHand.innerText = '👤';
        this.elements.computerHand.innerText = '💻';
        this.elements.resultText.innerText = 'VS';
        this.elements.resultText.className = 'result-text';
        this.elements.playerHand.className = 'hand';
        this.elements.computerHand.className = 'hand';

        this.isGameActive = true;
    }
}

// ページロード後に初期化
window.onload = () => {
    const game = new JankenGame();
    game.init();
};