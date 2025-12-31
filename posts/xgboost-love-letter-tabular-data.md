### Objective

- `XGBoost` (eXtreme Gradient Boosting) is a highly optimized version of gradient-boosted decision trees.
- It improves vanilla gradient boosting by adding
  - explicit regularization
  - better split scoring (uses both gradient + curvature)
  - lots of engineering optimizations (handles missing values, sparsity, parallelization)

### Model

- XGBoost builds an additive model of trees:
  - $\hat{y}_i = \hat{f}(x_i) = \sum_{b=1}^{B} f_b(x_i)$
  - each $f_b$ is a regression tree (even for classification; it outputs a score/logit)

### Objective Function (regularized)

- XGBoost minimizes:
  - $\mathcal{L} = \sum_{i=1}^{n} L(y_i, \hat{y}_i) + \sum_{b=1}^{B} \Omega(f_b)$
- A common tree regularizer:
  - $\Omega(f) = \gamma T + \frac{1}{2}\lambda\sum_{j=1}^{T} w_j^2$ (and sometimes $+\alpha\sum_{j=1}^{T}|w_j|$)
    - $T$ = # leaves
    - $w_j$ = leaf value (prediction for leaf $j$)
    - $\gamma,\lambda,\alpha$ control complexity

### Algorithm (how one new tree is added)

- At boosting step $b$:
  - we have current predictions $\hat{y}_i^{(b-1)}$
  - compute per-sample derivatives of the loss
    - $g_i = \frac{\partial L(y_i, \hat{y}_i)}{\partial \hat{y}_i}\Big|_{\hat{y}_i=\hat{y}_i^{(b-1)}}$ (gradient)
    - $h_i = \frac{\partial^2 L(y_i, \hat{y}_i)}{\partial \hat{y}_i^2}\Big|_{\hat{y}_i=\hat{y}_i^{(b-1)}}$ (hessian)
  - fit a tree by choosing splits that maximize the regularized gain
    - for a candidate leaf $j$, define $G_j = \sum_{i\in R_j} g_i$ and $H_j = \sum_{i\in R_j} h_i$
    - optimal leaf value:
      - $w_j^* = -\frac{G_j}{H_j+\lambda}$
    - split gain (is this split worth it?):
      - $\text{Gain} = \frac{1}{2}\left(\frac{G_L^2}{H_L+\lambda} + \frac{G_R^2}{H_R+\lambda} - \frac{G_P^2}{H_P+\lambda}\right) - \gamma$
      - Gain ≤ 0 → no split
  - update predictions (shrinkage)
    - $\hat{y}_i^{(b)} = \hat{y}_i^{(b-1)} + \eta\, f_b(x_i)$

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
  - smaller values need more trees but often generalize better
- Tree complexity
  - `max_depth`, `min_child_weight`, `gamma` (min split gain)
- Randomness (helps generalization)
  - `subsample` (row sampling)
  - `colsample_bytree`, `colsample_bynode` (column sampling)
- Leaf penalties
  - `reg_lambda` ($\lambda$) L2, `reg_alpha` ($\alpha$) L1

### Evaluation

- Use validation / CV to tune hyperparameters.
- Common best practice
  - `early_stopping_rounds` to stop when validation metric stops improving