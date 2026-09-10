# Word pack: Machine Learning

Copy this file's contents into `vocab-focus.md` in your project root to put these terms in Active mode.

| Term | Gloss | Meaning |
|---|---|---|
| overfitting | 过拟合 | model memorizes training data, generalizes poorly |
| underfitting | 欠拟合 | model too simple to capture the pattern |
| regularization | 正则化 | penalize complexity to reduce overfitting |
| bias-variance tradeoff | 偏差方差 | error from wrong assumptions vs from sensitivity |
| gradient descent | 梯度下降 | step downhill along the loss gradient |
| learning rate | 学习率 | step size for each update |
| batch / mini-batch / epoch | 批 / 小批 / 轮次 | full pass grouping of training samples |
| backpropagation | 反向传播 | propagate loss gradients backward through layers |
| vanishing / exploding gradient | 梯度消失 / 爆炸 | gradients shrink or blow up across layers |
| dropout | 随机失活 | randomly zero units during training |
| batch normalization | 批归一化 | normalize layer inputs per batch |
| activation function | 激活函数 | nonlinearity between layers |
| logits | 对数几率 | raw pre-softmax scores |
| softmax | 归一化指数 | turn scores into a probability distribution |
| cross-entropy loss | 交叉熵损失 | loss for classification |
| embedding | 嵌入 | dense vector representation of a discrete item |
| feature engineering | 特征工程 | hand-crafting model inputs |
| data leakage | 数据泄漏 | test-time info sneaks into training |
| train/validation/test split | 训练验证测试集 | partitions for fitting, tuning, reporting |
| cross-validation | 交叉验证 | rotate which fold is held out |
| hyperparameter | 超参数 | set before training, not learned |
| early stopping | 提前停止 | halt when validation loss stops improving |
| precision / recall | 查准 / 查全率 | correctness vs completeness of positives |
| F1 score | F1 分数 | harmonic mean of precision and recall |
| confusion matrix | 混淆矩阵 | table of predicted vs actual classes |
| inference | 推理 | running a trained model on new inputs |
| fine-tuning | 微调 | continue training a pretrained model |
| transfer learning | 迁移学习 | reuse knowledge from another task |
| attention | 注意力 | weight inputs by learned relevance |
| tokenization | 分词 | split text into model units |
