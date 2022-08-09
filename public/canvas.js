const canvas = document.querySelector("#signature");
const hiddenField = document.querySelector('input[type="hidden"]');

const canvasLeft = canvas.offsetLeft;
const canvasTop = canvas.offsetTop;

var isMoving = false;

document.querySelector("canvas").addEventListener("mousemove", draw);
document
    .querySelector("canvas")
    .addEventListener("mousedown", function (event) {
        setPosition(event);

        isMoving = true;
    });
document.querySelector("canvas").addEventListener("mouseenter", setPosition);
document.querySelector("canvas").addEventListener("mouseup", function () {
    isMoving = false;
});

let pos = { x: 0, y: 0 };

const ctx = canvas.getContext("2d");

function setPosition(event) {
    pos.x = event.clientX - canvasLeft;
    pos.y = event.clientY - canvasTop;
}

function draw(event) {
    if (isMoving === true) {
        ctx.beginPath();

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "	#00FFFF";

        ctx.moveTo(pos.x, pos.y);

        setPosition(event);
        ctx.lineTo(pos.x, pos.y);

        ctx.stroke();
        ctx.closePath();

        hiddenField.value = canvas.toDataURL();
    }
}

function sigImg() {
    let dataURL = canvas.toDataURL();
    let sigData = document.getElementById("sigData");
    sigData.value = dataURL;
}
