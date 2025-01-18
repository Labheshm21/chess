const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // Player role: "w" for white, "b" for black, or null for spectator

// Render the chessboard
const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ""; // Clear the board

    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowIndex + colIndex) % 2 === 0 ? "light" : "dark"
            );
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = colIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color && chess.turn() === square.color[0];

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: colIndex };
                        e.dataTransfer.setData("text/plain", ""); // Enable drag-and-drop
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault(); // Allow dropping
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece && sourceSquare) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    // Flip the board for the black player
    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

// Handle moves and validate with Chess.js
const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q", // Always promote to queen for simplicity
    };

    const result = chess.move(move); // Validate and make the move
    if (result) {
        socket.emit("move", move); // Notify server of the move
        renderBoard(); // Re-render the board
    } else {
        console.log("Invalid move");
    }
};

// Get the Unicode for chess pieces
const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "\u265F", // Black pawn
        r: "\u265C", // Black rook
        n: "\u265E", // Black knight
        b: "\u265D", // Black bishop
        q: "\u265B", // Black queen
        k: "\u265A", // Black king
        P: "\u2659", // White pawn
        R: "\u2656", // White rook
        N: "\u2658", // White knight
        B: "\u2657", // White bishop
        Q: "\u2655", // White queen
        K: "\u2654", // White king
    };
    return unicodePieces[piece.type] || "";
};

// Socket events for real-time updates
socket.on("playerRole", function (role) {
    playerRole = role.toLowerCase(); // Normalize to lowercase
    renderBoard();
});

socket.on("spectatorRole", function () {
    playerRole = null; // Set spectator mode
    renderBoard();
});

socket.on("boardState", function (fen) {
    chess.load(fen); // Update the board state
    renderBoard();
});

socket.on("move", function (move) {
    chess.move(move); // Apply the move locally
    renderBoard();
});

// Handle invalid moves
socket.on("invalidMove", (move) => {
    console.log("Invalid move:", move);
    alert("Invalid move. Please try again.");
});

// Initial rendering of the board
renderBoard();
