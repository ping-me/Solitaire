const Solitaire = (() => {
    // Initialisation des cartes
    let cards = [];
    let cardWidth = null;
    let cardHeight = null;

    // Le div du plateau de jeu
    let gameBoard = null;
    // Le div pour la pile
    let stock = null;
    // Les div pour les 4 familles
    let foundations = [];
    // Les div pour les 7 colonnes
    let piles = [];

    let curCardMoveListener = null;
    let curCardEndDrag = null;

    function canDropCard() {
        return true;
    }

    function startCardMove(event) {
        let blockToMove = event.target;
        let originX = blockToMove.offsetLeft;
        let originY = blockToMove.offsetTop;
        let mouseOriginX = event.clientX;
        let mouseOriginY = event.clientY;
        curCardMoveListener = (event) => cardMove(event, originX, originY, mouseOriginX, mouseOriginY);
        curCardEndDrag = (event) => endCardMove(event, originX, originY, mouseOriginX, mouseOriginY);
        blockToMove.addEventListener('mousemove', curCardMoveListener);
        blockToMove.addEventListener('mouseout', curCardEndDrag);
        blockToMove.addEventListener('mouseup', curCardEndDrag);
    }

    function cardMove(event, originX, originY, mouseOriginX, mouseOriginY) {
        let blockToMove = event.target;
        blockToMove.style.left = originX + event.clientX - mouseOriginX + 'px';
        blockToMove.style.top = originY + event.clientY - mouseOriginY + 'px';
    }

    function endCardMove(event, originX, originY, mouseOriginX, mouseOriginY) {
        let blockToMove = event.target;
        blockToMove.removeEventListener('mousemove', curCardMoveListener);
        blockToMove.removeEventListener('mouseout', curCardEndDrag);
        blockToMove.removeEventListener('mouseup', curCardEndDrag);

        // Vérifie si la carte peut être déposée à cet endroit
        if (canDropCard()) {
            blockToMove.style.left = originX + event.clientX - mouseOriginX + 'px';
            blockToMove.style.top = originY + event.clientY - mouseOriginY + 'px';
            blockToMove.style.transition ='transform 250ms ease-out';
            blockToMove.style.transform = 'translate(' + (event.clientX - mouseOriginX) * -1 + 'px, ' + (event.clientY - mouseOriginY) * -1 + 'px)';
            // On appelle cette fonction car il faut mettre à jour la position et enlever les effets d'animation
            window.setTimeout(() => updatePosition(blockToMove, originX, originY), 250);
        }
    }

    /**
     * Permet de mettre à jour la position de l'élément après une animation
     * @param block
     * @param x
     * @param y
     */
    function updatePosition(block, x, y) {
        block.style.removeProperty('transition');
        block.style.removeProperty('transform');
        block.style.left = x + 'px';
        block.style.top = y + 'px';
    }

    function deepestChild(node) {
        if (node.hasChildNodes()) {
            deepestChild(node.lastElementChild);
        }
        else {
            return node;
        }
    }

    /**
     * "Retourne" la carte pour montrer sa face
     * @param {HTMLElement} card La carte à retourner
     */
    function showCard(card) {
        card.style.backgroundPositionX = -(card.dataset.rank * cardWidth) + 'px';
        card.style.backgroundPositionY = -(card.dataset.suit * cardHeight) + 'px';
    }

    /**
     * Démarre un nouveau jeu.
     * Crée la pioche et distribue le jeu.
     */
    function newGame() {
        // Création d'un modèle de carte
        let cardBase = document.createElement('div');
        cardBase.style.backgroundSize = gameBoard.clientWidth + 'px';
        cardBase.style.width = cardWidth + 'px';
        cardBase.style.height = cardHeight + 'px';
        cardBase.style.backgroundImage  = 'url(\'assets/img/cards.png\')';
        // Par défaut on montre le dos de la carte
        cardBase.style.backgroundPositionX = -(2 * cardWidth) + 'px';
        cardBase.style.backgroundPositionY = -(4 * cardHeight) + 'px';
        cardBase.classList.add('game-card');
        cardBase.style.userSelect = 'none';

        // Création des cartes
        for (let suit = 0; suit < 4; suit++) {
            for (let rank = 0; rank < 13; rank++) {
                cards[suit * 13 + rank] = cardBase.cloneNode();
                cards[suit * 13 + rank].id = 's' + suit + 'r' + rank;
                cards[suit * 13 + rank].style.top = (cardHeight * 0.20) + 'px';
                cards[suit * 13 + rank].setAttribute('data-suit', suit.toString());
                cards[suit * 13 + rank].setAttribute('data-rank', rank.toString());
            }
        }

        // Mélange et placement des cartes dans la pile
        while(cards.length) {
            let currentIndex = (Math.floor(Math.random() * cards.length));
            stock.appendChild(cards[currentIndex].cloneNode());
            cards.splice(currentIndex, 1);
        }

        // Distribution des cartes
        for (let pile = 0; pile < 7; pile++) {
            let currentPile = document.getElementById('pile' + pile);
            let currentParent = currentPile;
            for (let cardCount = 0; cardCount <= pile; cardCount++) {
                let cardToMove = stock.lastChild.cloneNode();
                stock.removeChild(stock.lastChild);
                currentParent.appendChild(cardToMove);
                currentParent = cardToMove;
            }
            showCard(currentParent);
            currentParent.addEventListener('mousedown', startCardMove);
        }
    }

    /**
     * Adapte le plateau de jeu à la fenêtre
     */
    function resizeBoard() {
        // Hauteur maximale d'une pile : 4 cartes
        gameBoard.style.height = (cardHeight * 5.5) + 'px';
        gameBoard.style.marginBottom = (cardHeight * 0.5) + 'px';
        // Calcul de la grille d'affichage
        let gridColWidth = (gameBoard.clientWidth / 7);
        // Calcul du déplacement pour centrer la carte dans une case de la grille
        let gridCenterDelta = (gridColWidth / 2) - (cardWidth / 2);

        // Placement des différentes piles de cartes
        // Placement de la pioche
        stock.style.top = '0px';
        stock.style.left = gridCenterDelta + 'px';

        // placement des 4 familles
        for (let foundation = 0; foundation < 4; foundation++) {
            foundations[foundation].style.top = (cardHeight * 0.25) + 'px';
            foundations[foundation].style.left = (foundation * gridColWidth + gridColWidth * 3 + gridCenterDelta) + 'px';
        }

        // placement des 7 colonnes
        for (let pile = 0; pile < 7; pile++) {
            piles[pile].style.top = (cardHeight * 1.5) + 'px';
            piles[pile].style.left = (pile * gridColWidth + gridCenterDelta) + 'px';
        }
    }

    /**
     * Permet de renseigner le div conteneur du jeu.
     * DOIT être appelé
     * @param {HTMLElement} gameBoardDiv le div conteneur du plateau de jeu
     */
    function setGameBoard(gameBoardDiv) {
        gameBoard = gameBoardDiv;

        // Calcul de la taille des cartes
        cardWidth = (gameBoard.clientWidth / 13);
        // Ratio hauteur/largeur des cartes 29/20
        cardHeight = (cardWidth * 29 / 20);

        // Création d'une pile de base pour les autres piles
        let basePile = document.createElement('div');
        basePile.style.position = 'absolute';
        basePile.style.width = cardWidth + 'px';
        basePile.style.height = cardHeight + 'px';

        // Création de la pioche
        stock = basePile.cloneNode();
        stock.id = 'stock';
        gameBoard.appendChild(stock);

        // Création des emplacements pour les 4 familles
        for (let foundation = 0; foundation < 4; foundation++) {
            foundations[foundation] = basePile.cloneNode();
            foundations[foundation].id = 'foundation' + foundation;
            foundations[foundation].style.border = 'solid 1px #ccc';
            gameBoard.appendChild(foundations[foundation]);
        }

        // Création des emplacements pour les 7 colonnes
        for (let pile = 0; pile < 7; pile++) {
            piles[pile] = basePile.cloneNode();
            piles[pile].id = 'pile' + pile;
            gameBoard.appendChild(piles[pile]);
        }

        // Redimensionnement initial
        resizeBoard();
        // Et mise en callback de l'évènement window.resize
        window.onresize = resizeBoard;
    }

    /**
     * Démarre le jeu
     */
    function startGame() {
        if (gameBoard) {
            newGame();
        }
        else {
            alert('Tapis de jeu non défini : vous devez au préalable appeler Solitaire.setGameBoard()');
        }
    }

    return {
        setGameBoard : setGameBoard,
        startGame    : startGame
    }
})();