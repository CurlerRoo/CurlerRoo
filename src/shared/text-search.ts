type TokenizedText = {
  value: string;
  start: number;
  end: number;
  type: string;
  index: number;
  startLine: number;
  path: string;
};

export type Location = {
  start: number;
  end: number;
};

export const searchOnText = ({
  match,
  text,
}: {
  match: string;
  text: string;
}): (Location & {
  index: number;
})[] => {
  if (match?.length < 2) {
    return [];
  }
  if (!match || !text) {
    return [];
  }

  const locations: (Location & {
    index: number;
  })[] = [];
  let position = 0;
  let index = 0;
  while (position !== -1) {
    position = text.toLowerCase().indexOf(match.toLowerCase(), position);
    if (position !== -1) {
      locations.push({
        start: position,
        end: position + match.length,
        index,
      });
      position += match.length;
      index += 1;
    }
  }
  return locations;
};

export type HighlightedTokenizedText = TokenizedText & {
  highlights?: (Location & {
    index: number;
  })[];
};

type Mixed = (
  | (TokenizedText & {
      position: number;
      positionType: 'TokenStart' | 'TokenEnd';
    })
  | (Location & {
      index: number;
      position: number;
      positionType: 'MatchedLocationStart' | 'MatchedLocationEnd';
    })
)[];

export const getHightlightedTokenizedText = ({
  tokenizedTexts,
  matchedLocations,
}: {
  tokenizedTexts: TokenizedText[];
  matchedLocations: (Location & {
    index: number;
  })[];
}): HighlightedTokenizedText[] => {
  const mixed = ([] as Mixed)
    .concat(
      tokenizedTexts.flatMap(
        (tokenizedText) =>
          [
            {
              ...tokenizedText,
              position: tokenizedText.start,
              positionType: 'TokenStart',
            },
            {
              ...tokenizedText,
              position: tokenizedText.end,
              positionType: 'TokenEnd',
            },
          ] as Mixed,
      ),
    )
    .concat(
      matchedLocations.flatMap(
        (matchedLocation) =>
          [
            {
              ...matchedLocation,
              position: matchedLocation.start,
              positionType: 'MatchedLocationStart',
            },
            {
              ...matchedLocation,
              position: matchedLocation.end,
              positionType: 'MatchedLocationEnd',
            },
          ] as Mixed,
      ),
    )
    .sort((a, b) => a.position - b.position);

  const highlightedTokenizedTexts: HighlightedTokenizedText[] = mixed.reduce<{
    currentTokenizedText?: HighlightedTokenizedText;
    currentMatchedLocation?: Location & {
      index: number;
    };
    highlightedTokenizedTexts: HighlightedTokenizedText[];
  }>(
    (acc, current) => {
      if (current.positionType === 'TokenStart') {
        acc.currentTokenizedText = current as TokenizedText;
      } else if (current.positionType === 'TokenEnd') {
        if (acc.currentMatchedLocation) {
          const highlightStart =
            current.start > acc.currentMatchedLocation.start
              ? current.start
              : acc.currentMatchedLocation.start;

          const highlightEnd = current.end;
          if (highlightStart !== highlightEnd) {
            acc.currentTokenizedText!.highlights =
              acc.currentTokenizedText!.highlights || [];

            acc.currentTokenizedText!.highlights.push({
              start: highlightStart,
              end: highlightEnd,
              index: acc.currentMatchedLocation.index,
            });
          }
        }
        acc.highlightedTokenizedTexts.push(acc.currentTokenizedText!);
        acc.currentTokenizedText = undefined;
      } else if (current.positionType === 'MatchedLocationStart') {
        acc.currentMatchedLocation = current as Location & {
          index: number;
        };
      } else if (current.positionType === 'MatchedLocationEnd') {
        if (acc.currentTokenizedText) {
          const highlightStart =
            acc.currentTokenizedText.start > current.start
              ? acc.currentTokenizedText.start
              : current.start;

          const highlightEnd = current.end;

          if (highlightStart !== highlightEnd) {
            acc.currentTokenizedText.highlights =
              acc.currentTokenizedText.highlights || [];

            acc.currentTokenizedText.highlights.push({
              start: highlightStart,
              end: highlightEnd,
              index: current.index,
            });
          }
        }
        acc.currentMatchedLocation = undefined;
      }
      return acc;
    },
    {
      highlightedTokenizedTexts: [],
    },
  ).highlightedTokenizedTexts;

  return highlightedTokenizedTexts;
};

export const getLowlightAndHighlightSpans = ({
  text,
  highlights,
  searchResultSelectedIndex,
}: {
  text: string;
  highlights: (Location & {
    index: number;
  })[];
  searchResultSelectedIndex?: number;
}): {
  value: string;
  type: 'lowlight' | 'highlight' | 'selected';
  highlightIndex?: number;
  position: number;
}[] => {
  const { spans, currentPosition } = highlights
    .sort((a, b) => a.start - b.start)
    .reduce<{
      currentPosition: number;
      spans: {
        value: string;
        type: 'lowlight' | 'highlight' | 'selected';
        highlightIndex?: number;
        position: number;
      }[];
    }>(
      (acc, current) => {
        if (acc.currentPosition < current.start) {
          acc.spans.push({
            value: text.substring(acc.currentPosition, current.start),
            type: 'lowlight',
            position: acc.currentPosition,
          });
        }
        acc.spans.push({
          value: text.substring(current.start, current.end),
          type:
            searchResultSelectedIndex === current.index
              ? 'selected'
              : 'highlight',
          highlightIndex: current.index,
          position: current.start,
        });
        acc.currentPosition = current.end;
        return acc;
      },
      {
        currentPosition: 0,
        spans: [],
      },
    );
  spans.push({
    value: text.substring(currentPosition),
    type: 'lowlight',
    position: currentPosition,
  });
  return spans;
};
