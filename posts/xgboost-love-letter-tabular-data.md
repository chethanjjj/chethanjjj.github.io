### Objective (intuition first)

- `XGBoost` builds a strong model by adding **many small decision trees** one-by-one.
- Each new tree is a **correction** to the current predictions.
- The key advantages vs "plain" gradient boosting are:
  - explicit regularization (to reduce overfitting)
  - better split scoring (uses both gradient + curvature)
  - strong engineering (fast, handles missing/sparse values well)

### Big picture

- XGBoost is still an additive model:
  - $\hat{y}_i = \hat{f}(x_i) = \sum_{b=1}^{B} f_b(x_i)$
- Think of it as:
  - baseline prediction + correction tree + correction tree + ...

### What a new tree is trying to learn

- At boosting step $b$, you already have predictions $\hat{y}_i^{(b-1)}$.
- You now ask: "For each training point, should my prediction go **up** or **down**, and by how much?"

- For squared error regression, this is the familiar residual idea:
  - residual $= y_i - \hat{y}_i^{(b-1)}$
  - if residual is positive → next tree should push prediction up
  - if residual is negative → next tree should push prediction down

- For general losses, XGBoost uses the same idea but with derivatives:
  - $g_i$ (gradient) = the direction to change $\hat{y}_i$ to reduce loss
  - $h_i$ (hessian) = how "sensitive" the loss is around $\hat{y}_i$ (stability / confidence)

### Objective Function (why regularization matters)

- XGBoost optimizes training loss + a penalty for complexity:
  - $\mathcal{L} = \sum_{i=1}^{n} L(y_i, \hat{y}_i) + \sum_{b=1}^{B} \Omega(f_b)$

- A common regularizer for a tree $f$ is:
  - $\Omega(f) = \gamma T + \frac{1}{2}\lambda\sum_{j=1}^{T} w_j^2$ (and sometimes $+\alpha\sum_{j=1}^{T}|w_j|$)
    - $T$ = # leaves (more leaves = more complex)
    - $w_j$ = value predicted by leaf $j$
    - $\gamma,\lambda,\alpha$ penalize complexity

### Algorithm (how one tree is added) — more intuition

At boosting step $b$, you already have predictions $\hat{y}_i^{(b-1)}$. You want to add one new tree that makes the loss smaller.

1. Compute how each point wants its prediction to change
    - Compute derivatives of the loss at the current predictions
      - $g_i = \frac{\partial L(y_i, \hat{y}_i)}{\partial \hat{y}_i}\Big|_{\hat{y}_i=\hat{y}_i^{(b-1)}}$ (gradient)
        - If $g_i > 0$, decreasing $\hat{y}_i$ reduces loss; if $g_i < 0$, increasing $\hat{y}_i$ reduces loss
      - $h_i = \frac{\partial^2 L(y_i, \hat{y}_i)}{\partial \hat{y}_i^2}\Big|_{\hat{y}_i=\hat{y}_i^{(b-1)}}$ (hessian / curvature)
        - "How sensitive" the loss is around the current prediction (bigger $h_i$ → loss changes faster)
    - Quick example (squared error)
      - If $L(y,\hat{y}) = \frac{1}{2}(y-\hat{y})^2$, then $g_i = \hat{y}_i - y_i$ and $h_i = 1$
      - If $y=80$ and $\hat{y}=100$, then $g = 20$ (positive) → the next tree should push the prediction down

2. Grow a tree that groups similar corrections
    - A tree partitions points into leaves (regions) $R_1, R_2, ...$
    - Inside a leaf $j$, XGBoost applies the *same* correction value $w_j$ to every point in that leaf

3. For each leaf, compute the best correction value
    - Aggregate the derivatives inside a leaf $j$
      - $G_j = \sum_{i\in R_j} g_i$ (total "push" direction)
      - $H_j = \sum_{i\in R_j} h_i$ (total curvature)
    - The best leaf value is
      - $w_j^* = -\frac{G_j}{H_j+\lambda}$
        - Minus sign = move opposite the gradient (reduce loss)
        - $\lambda$ shrinks leaf values (regularization)

4. Decide splits using Gain (is the split worth it?)
    - When you split a parent node $P$ into left $L$ and right $R$, you compare
      - one correction for everyone in $P$ vs separate corrections for $L$ and $R$
    - Split gain (worth-it score)
      - $\text{Gain} = \frac{1}{2}\left(\frac{G_L^2}{H_L+\lambda} + \frac{G_R^2}{H_R+\lambda} - \frac{G_P^2}{H_P+\lambda}\right) - \gamma$
      - Gain ≤ 0 → no split
      - $\gamma$ penalizes adding a split (prevents unnecessary splits)

5. Update predictions with shrinkage (small step)
    - After you build tree $f_b$, update predictions
      - $\hat{y}_i^{(b)} = \hat{y}_i^{(b-1)} + \eta\, f_b(x_i)$
    - $\eta$ (learning rate) controls how much we trust each new tree (smaller $\eta$ → safer updates, usually needs more trees)

### Regression vs Classification

- Regression
  - choose a regression loss (common: squared error)
  - final prediction is the sum of tree outputs
- Classification
  - commonly uses logistic loss
  - model outputs a score (logit); probability is:
    - $p(y=1|x) = \sigma(\hat{f}(x))$

### Regularization / Hyperparameters (common)

- `n_estimators` ($B$)
  - number of boosting rounds
- `learning_rate` ($\eta$)
  - size of each correction step (smaller usually needs more trees)

- Tree complexity
  - `max_depth` (how complex each correction tree can be)
  - `min_child_weight` (prevents tiny/noisy splits)
  - `gamma` (min split gain; discourages unnecessary splits)

- Randomness (helps generalization)
  - `subsample` (row sampling)
  - `colsample_bytree`, `colsample_bynode` (column sampling)

- Leaf penalties
  - `reg_lambda` ($\lambda$) L2
  - `reg_alpha` ($\alpha$) L1

### Evaluation

- Use validation / CV to tune hyperparameters.
- Best practice
  - `early_stopping_rounds` to stop when validation metric stops improving
- Metrics
  - regression: RMSE / MAE
  - classification: logloss, ROC-AUC / PR-AUC (depending on class imbalance)