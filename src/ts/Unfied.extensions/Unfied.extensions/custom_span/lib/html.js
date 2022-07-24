const htmlTag = {
    enter: {
        span() {
            this.tag('<del>');
        }
    },
    exit: {
        span() {
            this.tag('</del>');
        }
    }
};
export { htmlTag };
