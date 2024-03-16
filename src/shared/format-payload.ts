export const formatOutputBody = ({
  contentType,
  payload,
}: {
  contentType?: string;
  payload: string;
}) => {
  try {
    if (contentType?.includes('application/json')) {
      return JSON.stringify(JSON.parse(payload), null, 2);
    }
    return payload;
  } catch (error) {
    return payload;
  }
};
