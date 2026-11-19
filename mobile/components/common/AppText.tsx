import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { usePreferences } from '../../contexts/PreferencesContext';

export interface AppTextProps extends TextProps {
  fixedSize?: boolean;
}

export const AppText: React.FC<AppTextProps> = ({
  style,
  allowFontScaling = false,
  fixedSize = false,
  children,
  ...props
}) => {
  const { fs } = usePreferences();

  if (fixedSize) {
    return (
      <RNText {...props} style={style} allowFontScaling={allowFontScaling}>
        {children}
      </RNText>
    );
  }

  const flat = StyleSheet.flatten(style);
  if (!flat || typeof flat !== 'object') {
    return (
      <RNText {...props} style={style} allowFontScaling={allowFontScaling}>
        {children}
      </RNText>
    );
  }

  if (flat.fontSize) {
    const scaledFontSize = fs(flat.fontSize);
    const scaledLineHeight = flat.lineHeight ? Math.round(fs(flat.lineHeight)) : undefined;

    return (
      <RNText
        {...props}
        style={[
          style,
          {
            fontSize: scaledFontSize,
            ...(scaledLineHeight ? { lineHeight: scaledLineHeight } : {}),
          },
        ]}
        allowFontScaling={allowFontScaling}
      >
        {children}
      </RNText>
    );
  }

  return (
    <RNText {...props} style={style} allowFontScaling={allowFontScaling}>
      {children}
    </RNText>
  );
};

export { AppText as Text };
export default AppText;
