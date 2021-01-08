const Solitaire = (() => {
    // Initialisation des cartes
    let cardWidth = null;
    let cardHeight = null;
    let gridColWidth = null;

    // Le div du plateau de jeu
    let gameBoard = null;
    // Le div pour la pile cachée
    let hiddenStock = null;
    // Le div pour la pile ouverte
    let openStock = null;
    // Les div pour les 4 familles
    let foundations = [];
    // Les div pour les 7 colonnes
    let piles = [];

    // Gestion du drag n drop
    let curCardMoveListener = null;
    let curCardEndDrag = null;
    let curHoveredCard = null;

    /**
     * Détection de collision entre 2 divs.
     * Source : https://stackoverflow.com/questions/9768291/check-collision-between-certain-divs
     * @param a Premier div à comparer
     * @param b Second div à comparer
     * @return {boolean} true si les divs se touchent, false sinon.
     */
    let overlaps = (function () {
        function getPositions( elem ) {
            let posLeft, posTop;
            let boundingBox = elem.getBoundingClientRect();
            posLeft = boundingBox.x;
            posTop = boundingBox.y;
            return [ [ posLeft, posLeft + elem.clientWidth / 2 ], [ posTop, posTop + elem.clientHeight ] ];
        }

        function comparePositions( p1, p2 ) {
            let r1, r2;
            r1 = p1[0] < p2[0] ? p1 : p2;
            r2 = p1[0] < p2[0] ? p2 : p1;
            return r1[1] > r2[0] || r1[0] === r2[0];
        }

        return function ( a, b ) {
            let pos1 = getPositions( a ),
                pos2 = getPositions( b );
            return comparePositions( pos1[0], pos2[0] ) && comparePositions( pos1[1], pos2[1] );
        };
    })();

    /**
     * Retire les bordures de toutes les familles, colonne et carte ouverte en fin de colonne
     */
    function removeCardsBorder() {
        for (let pile = 0; pile < 7; pile++) {
            piles[pile].style.border = '';
            let pileCards = piles[pile].querySelectorAll('.game-card');
            if (pileCards.length) {
                pileCards[pileCards.length - 1].style.border = '';
            }
            if ((pile > 2) && (pile < 7)) {
                foundations[pile - 3].style.border = '';
            }
        }
    }

    /**
     * Retourne la carte ouverte au bout de la colonne ou la base de la famille ou colonne
     * au dessus de laquelle se trouve la carte actuellement déplacée
     * @param event L'événement déclencheur
     * @returns {HTMLElement} la dernière carte ouverte, sinon null
     */
    function getPileOpenCard(event) {
        let pileOpenCard = null;
        // Au dessus de quelle colonne est on ?
        let curPile = Math.round((((event.clientX - (event.clientX % gridColWidth)) / gridColWidth) - 1));
        // Vérifie si on pose sur les colonnes
        let curHoveredPile = document.getElementById('pile' + curPile);
        if (curHoveredPile) {
            // Y a t il des enfants ?
            if (curHoveredPile.children.length) {
                // On obtient le dernier enfant
                let pileCard = getDeepestChild(curHoveredPile);
                if (pileCard) {
                    if (overlaps(event.target, pileCard) && (pileCard !== event.target)) {
                        pileOpenCard = pileCard;
                    }
                }
            }
            else {
                // Sinon on retourne la base de la colonne
                pileOpenCard = curHoveredPile;
            }
        }
        // Vérifie si pose sur les familles
        if ((curPile > 2) && (curPile < 7)) {
            let curHoveredFoundation = document.getElementById('foundation' + ( curPile - 3));
            if(curHoveredFoundation) {
                if (overlaps(event.target, curHoveredFoundation)) {
                    pileOpenCard = curHoveredFoundation;
                }
            }
        }
        return pileOpenCard;
    }

    /**
     * Vérifie si la carte peut être déposée à cet endroit
     * @param event L'événement onmouseup/onmouseout en cours
     * @returns {boolean} true si on peut poser la pièce, false sinon
     */
    function canDropCard(event) {
        let canDrop = false;
        if (curHoveredCard) {
            // On essaie de poser sur une colonne vide
            if (curHoveredCard.id.includes('pile')) {
                // Est-ce que c'est un roi ?
                if (event.target.dataset.rank === '12') {
                    canDrop = true;
                }
            }
            // On essaie de poser sur une famille
            else if (curHoveredCard.id.includes('foundation')) {
                if (curHoveredCard.children.length) {
                    let foundationOpenCard = getDeepestChild(curHoveredCard);
                    // On vérifie la couleur de la famille actuelle
                    if (foundationOpenCard.dataset.suit === event.target.dataset.suit) {
                        // On vérifie la continuité
                        if (parseInt(foundationOpenCard.dataset.rank) + 1 === parseInt(event.target.dataset.rank)) {
                            canDrop = true;
                        }
                    }
                }
                else {
                    // Famille vide : essaie t-on de poser un as ?
                    if (event.target.dataset.rank === '0') {
                        canDrop = true;
                    }
                }
            }
            // Sinon on essaie de poser sur la carte ouverte d'une colonne
            else {
                if (parseInt(curHoveredCard.dataset.rank) === (parseInt(event.target.dataset.rank) + 1)) {
                    if ((curHoveredCard.dataset.suit === '0') || (curHoveredCard.dataset.suit === '3')) {
                        if ((event.target.dataset.suit === '1') || (event.target.dataset.suit === '2')) {
                            canDrop = true;
                        }
                    } else {
                        if ((event.target.dataset.suit === '0') || (event.target.dataset.suit === '3')) {
                            canDrop = true;
                        }
                    }
                }
            }
        }
        return canDrop;
    }

    /**
     * Fonction callback de l'événement onmousedown.
     * Initie un drag n drop
     * @param event L'événement en cours
     */
    function startCardMove(event) {
        let cardToMove = event.target;
        let originX = cardToMove.offsetLeft;
        let originY = cardToMove.offsetTop;
        let mouseOriginX = event.clientX;
        let mouseOriginY = event.clientY;
        curCardMoveListener = (event) => cardMove(event, originX, originY, mouseOriginX, mouseOriginY);
        curCardEndDrag = (event) => endCardMove(event, originX, originY, mouseOriginX, mouseOriginY);
        cardToMove.addEventListener('mousemove', curCardMoveListener);
        cardToMove.addEventListener('mouseout', curCardEndDrag);
        cardToMove.addEventListener('mouseup', curCardEndDrag);
        cardToMove.style.cursor = 'grabbing';
        cardToMove.style.boxShadow = '15px 15px 10px -5px #000';
        cardToMove.style.zIndex = '1';
    }

    /**
     * Fonction callback de l'événement onmousemove.
     * N'est déclenché que si un mousedown a eu lieu au préalable.
     * Gère le déplacement de la carte en cours et surveille
     * quels carte, colonne ou famille sont survolés
     * @param event L'événement en cours
     * @param originX La position X originale de la carte à déplacer
     * @param originY La position Y originale de la carte à déplacer
     * @param mouseOriginX La position X originale de la souris
     * @param mouseOriginY La position Y originale de la souris
     */
    function cardMove(event, originX, originY, mouseOriginX, mouseOriginY) {
        let cardToMove = event.target;
        cardToMove.style.left = originX + event.clientX - mouseOriginX + 'px';
        cardToMove.style.top = originY + event.clientY - mouseOriginY + 'px';
        // On vérifie si on passe au dessus d'une carte ouverte des colonnes
        curHoveredCard = getPileOpenCard(event);
        if (curHoveredCard) {
            curHoveredCard.style.border = 'solid 3px #44f';
        }
        else {
            removeCardsBorder();
        }
    }

    /**
     * Fonction callback pour l'événement onmouseout et onmouseup.
     * Appelé à la fin d'un drag n drop.
     * Nettoie la carte déplacée de tous les listeners inutiles,
     * effectue le placement final avec la gestion des animations CSS
     * @todo Nettoyer correctement les listener qui semblent s'inscrirent plusieurs fois...
     * @param event L'événement en cours
     * @param originX La position X originale de la carte à déplacer
     * @param originY La position Y originale de la carte à déplacer
     * @param mouseOriginX La position X originale de la souris
     * @param mouseOriginY La position Y originale de la souris
     */
    function endCardMove(event, originX, originY, mouseOriginX, mouseOriginY) {
        let cardToMove = event.target;
        removeCardsBorder();
        cardToMove.removeEventListener('mousemove', curCardMoveListener);
        cardToMove.removeEventListener('mouseout', curCardEndDrag);
        cardToMove.removeEventListener('mouseup', curCardEndDrag);

        // Vérifie si la carte peut être déposée à cet endroit
        cardToMove.style.left = originX + event.clientX - mouseOriginX + 'px';
        cardToMove.style.top = originY + event.clientY - mouseOriginY + 'px';
        cardToMove.style.transform = 'translate(' + -(event.clientX - mouseOriginX) + 'px, ' + -(event.clientY - mouseOriginY) + 'px)';
        cardToMove.style.transition ='transform 250ms ease-out';
        cardToMove.style.cursor = 'grab';
        if (canDropCard(event)) {
            // On place la carte dans la bonne pile
            curHoveredCard.appendChild(cardToMove);
            // On retourne toute les cartes enfants
            for (let pile = 0; pile < 7; pile++) {
                let deepestChild = getDeepestChild(piles[pile]);
                if (deepestChild) {
                    showCard(deepestChild);
                }
            }
            cardToMove.style.zIndex = '';
            cardToMove.style.boxShadow = '';
            if (curHoveredCard.id.includes('foundation')) {
                // Est-ce que toutes les familles sont complétées ?
                if (foundations[0].children.length + foundations[1].children.length + foundations[2].children.length + foundations[3].children.length === 52) {
                    alert('Gagné !');
                    // On vide tout
                    for (let foundation = 0; foundation < 4; foundation++) {
                        foundations[foundation].innerHTML = '';
                    }
                    // Et on recommence...
                    startGame();
                }
            }
            else {
                if (!curHoveredCard.id.includes('pile')) {
                    // On appelle cette fonction car il faut mettre à jour la position et enlever les effets d'animation
                    window.setTimeout(() => updatePosition(cardToMove, curHoveredCard.offsetLeft, curHoveredCard.offsetTop), 250);
                    window.setTimeout(() => removeEffects(cardToMove), 250);
                }
            }
        }
        else {
            // On replace la carte à sa place d'origine
            window.setTimeout(() => updatePosition(cardToMove, originX, originY), 250);
            window.setTimeout(() => removeEffects(cardToMove), 250);
        }
    }

    /**
     * Permet de mettre à jour la position de l'élément après une animation
     * @param card La carte dont la position est à mettre à jour
     * @param x La position x finale
     * @param y La position y finale
     */
    function updatePosition(card, x, y) {
        card.style.left = x + 'px';
        card.style.top = y + 'px';
    }

    /**
     * Supprime les effets spéciaux sur l'élément
     * @param card La carte dont les effets doivent être retirés
     */
    function removeEffects(card) {
        card.style.removeProperty('transition');
        card.style.removeProperty('transform');
    }

    /**
     * Retourne l'élément enfant de plus bas niveau
     * @param node L'élément sur lequel s'effectue la recherche
     * @returns {HTMLElement} si des enfants existent, sinon null
     */
    function getDeepestChild(node) {
        let deepestChild = null;
        let pileCards = node.querySelectorAll('.game-card');
        if (pileCards.length) {
            deepestChild = pileCards[pileCards.length - 1];
        }
        return deepestChild;
    }

    /**
     * Découvre une carte de la pioche fermée et la met sur la pioche ouverte
     */
    function revealHiddenStock() {
        if (hiddenStock.children.length) {
            let cardToReveal = hiddenStock.lastChild;
            openStock.appendChild(cardToReveal);
            if (hiddenStock.children.length) {
                hiddenStock.lastChild.addEventListener('click', revealHiddenStock);
            }
            else {
                hiddenStock.addEventListener('click', revealHiddenStock);
            }
            cardToReveal.removeEventListener('click', revealHiddenStock);
            showCard(cardToReveal);
        }
        else {
            // On remet les cartes découverte dans la pioche en "retournant" le tas
            while (openStock.children.length) {
                showCard(openStock.lastChild, false);
                hiddenStock.appendChild(openStock.lastChild);
            }
            // Et on rend la dernière carte de la pile cachée active au clic pour pouvoir la retourner
            hiddenStock.lastChild.addEventListener('click', revealHiddenStock);
        }
    }

    /**
     * "Retourne" la carte pour montrer sa face ou la cacher
     * @param {HTMLElement} card La carte à retourner
     * @param {boolean} show Montre t-on la carte ?  On montre par défaut
     */
    function showCard(card, show = true) {
        if(show) {
            card.style.backgroundPositionX = -(card.dataset.rank * cardWidth) + 'px';
            card.style.backgroundPositionY = -(card.dataset.suit * cardHeight) + 'px';
            card.addEventListener('mousedown', startCardMove);
        }
        else {
            card.style.backgroundPositionX = -(2 * cardWidth) + 'px';
            card.style.backgroundPositionY = -(4 * cardHeight) + 'px';
            card.removeEventListener('mousedown', startCardMove);
        }
    }

    /**
     * Démarre un nouveau jeu.
     * Crée la pioche et distribue le jeu.
     */
    function newGame() {
        // Création d'un modèle de carte
        let cardBase = document.createElement('div');
        cardBase.classList.add('game-card');
        cardBase.style.backgroundImage  = 'url(\'assets/img/cards.png\')';
        cardBase.style.backgroundSize = gameBoard.clientWidth + 'px';
        // Par défaut on montre le dos de la carte
        cardBase.style.backgroundPositionX = -(2 * cardWidth) + 'px';
        cardBase.style.backgroundPositionY = -(4 * cardHeight) + 'px';
        cardBase.style.width = cardWidth + 'px';
        cardBase.style.height = cardHeight + 'px';
        cardBase.style.userSelect = 'none';
        cardBase.style.top =  (cardHeight * 0.2) + 'px';

        // Création des cartes
        let cards = [];
        for (let suit = 0; suit < 4; suit++) {
            for (let rank = 0; rank < 13; rank++) {
                cards[suit * 13 + rank] = cardBase.cloneNode();
                cards[suit * 13 + rank].id = 's' + suit + 'r' + rank;
                cards[suit * 13 + rank].setAttribute('data-suit', suit.toString());
                cards[suit * 13 + rank].setAttribute('data-rank', rank.toString());
            }
        }

        // Mélange et placement des cartes dans la pile
        while(cards.length) {
            let currentIndex = (Math.floor(Math.random() * cards.length));
            hiddenStock.appendChild(cards[currentIndex].cloneNode());
            cards.splice(currentIndex, 1);
        }

        // Distribution des cartes
        for (let pile = 0; pile < 7; pile++) {
            let currentParent = document.getElementById('pile' + pile);
            for (let cardCount = 0; cardCount <= pile; cardCount++) {
                let cardToMove = hiddenStock.lastChild;
                currentParent.appendChild(cardToMove);
                currentParent = cardToMove;
            }
            // On retourne la dernière carte de la pile
            showCard(currentParent);
        }

        // On rend la dernière carte de la pile cachée active au clic pour pouvoir la retourner
        hiddenStock.lastChild.addEventListener('click', revealHiddenStock);
    }

    /**
     * Adapte le plateau de jeu à la fenêtre
     */
    function resizeBoard() {

        // Hauteur maximale d'une pile : 4 cartes
        gameBoard.style.height = (cardHeight * 5.5) + 'px';
        gameBoard.style.marginBottom = (cardHeight * 0.5) + 'px';
        // Calcul de la grille d'affichage
        gridColWidth = (gameBoard.clientWidth / 7);
        // Calcul du déplacement pour centrer la carte dans une case de la grille
        let gridCenterDelta = (gridColWidth / 2) - (cardWidth / 2);

        // Placement des différentes piles de cartes
        // Placement des pioches
        hiddenStock.style.top = (cardHeight * 0.25) + 'px';
        hiddenStock.style.left = gridCenterDelta + 'px';
        openStock.style.top = (cardHeight * 0.25) + 'px';
        openStock.style.left = (gridCenterDelta + gridColWidth) + 'px';

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
        basePile.style.boxShadow = 'inset 1px 1px 1.5px #0008, 1px 1px 0.5px #fff4';

        // Création des pioches
        hiddenStock = basePile.cloneNode();
        hiddenStock.id = 'hidden-stock';
        gameBoard.appendChild(hiddenStock);
        openStock = basePile.cloneNode();
        openStock.id = 'open-stock';
        gameBoard.appendChild(openStock);

        for (let style of document.styleSheets) {
            if(style.href.includes('Solitaire.css')) {
                style.addRule('.game-card:first-child', 'top: 0px');
                break;
            }
        }

        // Création des emplacements pour les 4 familles
        for (let foundation = 0; foundation < 4; foundation++) {
            foundations[foundation] = basePile.cloneNode();
            foundations[foundation].id = 'foundation' + foundation;
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
            alert('Tapis de jeu non défini : la fonction Solitaire.setGameBoard() doit être appelée au préalable.');
        }
    }

    return {
        setGameBoard : setGameBoard,
        startGame    : startGame
    }
})();