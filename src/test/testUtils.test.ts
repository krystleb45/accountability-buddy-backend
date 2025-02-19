import sanitizeHtml from "sanitize-html";

const sanitizeInput = (input: string): string => {
  return sanitizeHtml(input, {
    allowedTags: [], // Remove all tags
    allowedAttributes: {}, // Remove all attributes
  });
};

export default sanitizeInput;
