import { View, Text } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenWrapper = ({ children, bg }) => {
    const { top } = useSafeAreaInsets(); //Hook que dá informação sobre o status bar, navigation bar etc...
    const paddingTop = top > 0 ? top + 5 : 30; //para casos em que o telemovel tem algo que esconda a parte superior do ecra
                                               //o padding vai ser 30, se nao, será acrescentado 5 ao valor

    return (
        <View style={{ flex: 1, paddingTop, backgroundColor: bg }}>
            {children}
        </View>
    );
};

export default ScreenWrapper;
