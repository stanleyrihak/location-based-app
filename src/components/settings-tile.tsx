import {View, StyleSheet, Text} from "react-native";


export type SettingsTileProps = {
    name: string;
}

const SettingsTile = ({name}: SettingsTileProps) => {
    return <View style={styles.container}>
        <View style={styles.iconWrapper}></View>
        <Text>{name}</Text>
    </View>
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: 56,
        backgroundColor: 'white'
    },
    iconWrapper: {
        height: 30,
        width: 30,
        borderRadius: 8,
        backgroundColor: '#E5F2EC',
    }
})

export default SettingsTile