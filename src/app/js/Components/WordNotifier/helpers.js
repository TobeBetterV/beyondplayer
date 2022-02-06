export function getCubicBezierTransition(duration = 500, cubicBezier = 'linear', delay = 0, property = 'height') {
    return `${duration}ms ${property} ${cubicBezier} ${delay}ms`;
}

export function getRandomId() {
    return Math.random()
        .toString(36)
        .substr(2, 9);
}

export function getNotificationOptions(options) {
    const notification = options;
    const { id } = notification;

    notification.id = id || getRandomId();

    return notification;
}
