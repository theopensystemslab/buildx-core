class GestureRecognizer {
  private isPointerDown = false;
  private startX = 0;
  private startY = 0;
  private lastTapTime = 0;

  constructor(private target: HTMLElement) {
    this.target.addEventListener("pointerdown", this.onPointerDown.bind(this));
    this.target.addEventListener("pointermove", this.onPointerMove.bind(this));
    this.target.addEventListener("pointerup", this.onPointerUp.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    this.isPointerDown = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isPointerDown) return;

    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      // Threshold for drag
      this.onDrag();
      this.startX = event.clientX; // Reset start coordinates to keep dragging
      this.startY = event.clientY;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    this.isPointerDown = false;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const now = Date.now();
    if (distance < 5) {
      // Threshold for tap detection
      if (now - this.lastTapTime < 300) {
        // Double tap threshold
        this.onDoubleTap();
      } else {
        this.onTap();
      }
      this.lastTapTime = now;
    }
  }

  protected onTap(): void {
    console.log("Tap detected.");
  }

  protected onDoubleTap(): void {
    console.log("Double Tap detected.");
  }

  protected onDrag(): void {
    console.log("Drag detected.");
  }
}

export default GestureRecognizer;
